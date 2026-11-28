# MAGIC CREATIONS — RSVP Idempotency Remediation Patch Proposal
Date: 2026-11-28
Branch: `ceo/project-completion-2026-11-18`

## Status and safety
This is a review/proposal document, **not an executable migration**. The connected Supabase project `yidsydqmiodolhgftypv` currently reports `INACTIVE`. No database SQL was executed, no migration was applied, and no function was deployed.

Do not save this file under `supabase/migrations/`. A real migration must be created through the repository's Supabase CLI workflow after the project/runtime is available.

## Defect
The current `public.submit_guest_rsvp` function inserts into `guest_rsvp_events` with `ON CONFLICT (request_id) DO NOTHING`. It then treats every conflict as a successful idempotent replay without checking whether the existing event belongs to the same guest, invitation, and response.

This means a reused request UUID can be reported as saved for the wrong guest or a different response, while silently skipping the intended update.

## SQL function replacement proposal
The following is the proposed replacement body for `public.submit_guest_rsvp(text, text, uuid)`. It retains the existing token validation, published-invitation check, per-token 8-attempt / 15-minute rate limit, service-role-only execution, and guest row lock. On duplicate request IDs it confirms the existing event's complete identity before returning idempotent success.

```sql
create or replace function public.submit_guest_rsvp(
  p_token_hash text,
  p_response text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest_id uuid;
  v_invitation_id uuid;
  v_guest_name text;
  v_guest_count integer;
  v_status text;
  v_attempts integer;
  v_inserted integer;
  v_existing_invitation_id uuid;
  v_existing_guest_id uuid;
  v_existing_response text;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
     or p_response not in ('attending','not_attending')
     or p_request_id is null then
    raise exception 'Invalid RSVP request.';
  end if;

  select g.id, g.invitation_id, g.guest_name, g.guest_count
    into v_guest_id, v_invitation_id, v_guest_name, v_guest_count
    from public.guest_invitation_tokens t
    join public.guests g on g.id = t.guest_id and g.invitation_id = t.invitation_id
    join public.invitations i on i.id = t.invitation_id
   where t.token_hash = p_token_hash
     and t.revoked_at is null
     and t.expires_at > now()
     and i.published = true
   for update of g;

  if not found then
    raise exception 'This invitation link is invalid or has expired.';
  end if;

  insert into public.guest_rsvp_rate_limits (token_hash, window_started_at, attempts)
  values (p_token_hash, now(), 1)
  on conflict (token_hash) do update
    set window_started_at = case
          when public.guest_rsvp_rate_limits.window_started_at <= now() - interval '15 minutes'
          then now()
          else public.guest_rsvp_rate_limits.window_started_at
        end,
        attempts = case
          when public.guest_rsvp_rate_limits.window_started_at <= now() - interval '15 minutes'
          then 1
          else public.guest_rsvp_rate_limits.attempts + 1
        end
  returning attempts into v_attempts;

  if v_attempts > 8 then
    return jsonb_build_object('saved', false, 'rate_limited', true);
  end if;

  insert into public.guest_rsvp_events (
    request_id, invitation_id, guest_id, response
  ) values (
    p_request_id, v_invitation_id, v_guest_id, p_response
  ) on conflict (request_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select e.invitation_id, e.guest_id, e.response
      into v_existing_invitation_id, v_existing_guest_id, v_existing_response
      from public.guest_rsvp_events e
     where e.request_id = p_request_id
     for update;

    if not found then
      raise exception 'The RSVP request could not be verified.';
    end if;

    if v_existing_invitation_id <> v_invitation_id
       or v_existing_guest_id <> v_guest_id
       or v_existing_response <> p_response then
      return jsonb_build_object('saved', false, 'conflict', true);
    end if;

    select g.rsvp_status into v_status
      from public.guests g where g.id = v_guest_id;

    return jsonb_build_object(
      'saved', true,
      'idempotent', true,
      'guest_name', v_guest_name,
      'guest_count', v_guest_count,
      'rsvp_status', v_status
    );
  end if;

  update public.guests
     set rsvp_status = p_response,
         rsvp_responded_at = now()
   where id = v_guest_id;

  return jsonb_build_object(
    'saved', true,
    'idempotent', false,
    'guest_name', v_guest_name,
    'guest_count', v_guest_count,
    'rsvp_status', p_response
  );
end;
$$;

revoke all on function public.submit_guest_rsvp(text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, uuid)
  to service_role;
```

## Edge Function response mapping proposal
In `supabase/functions/guest-rsvp/index.ts`, after handling `data?.rate_limited` and before the generic failure response, add:

```ts
if (data?.conflict) {
  return jsonResponse(req, {
    error: "This RSVP request could not be verified. Please refresh your invitation and try again.",
  }, 409);
}
```

This avoids exposing whether the request UUID belongs to another guest or response while correctly distinguishing an idempotency conflict from a saved RSVP.

## Required staging tests
1. New request UUID + valid token + attending: one event inserted; guest status updated.
2. Exact replay (same token, guest, invitation, response, request UUID): success with `idempotent: true`; no second event.
3. Same request UUID, same guest, different response: `conflict: true`; guest status unchanged.
4. Same request UUID, different guest/token: `conflict: true`; neither guest is modified by the replay.
5. Same request UUID, different invitation: `conflict: true`.
6. Two concurrent exact submissions: one event only; both resolve consistently.
7. Two concurrent conflicting submissions using the same request UUID: at most one event; the other returns conflict.
8. Expired, revoked, malformed token and unpublished invitation remain rejected.
9. Ninth attempt within the 15-minute token window returns rate-limited (existing limit).
10. Confirm `anon` and `authenticated` cannot execute the RPC; `service_role` can.

## Migration and verification workflow
1. Restore/activate the Supabase project only with owner approval if a billable action or account change is required.
2. Use a local repository checkout and inspect `supabase --version`, `supabase --help`, and `supabase migration --help`. CLI v3 is local-by-default and uses `--remote` for hosted operations; never assume an unqualified command targets the intended database.
3. Create the migration file using the supported CLI command (for example, `supabase migration new fix_guest_rsvp_request_idempotency`); do not hand-invent a timestamped migration filename.
4. Test against a local database or isolated staging project, run the test matrix, inspect grants/RLS, and run Supabase security/performance advisors.
5. Confirm migration history and generated SQL before any hosted apply.
6. Production application and Edge Function deployment require separate explicit approval.

## Related Supabase guidance
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Supabase CLI v3 breaking change](https://supabase.com/changelog?types=breaking-change)
- [Supabase Data API security and grants](https://supabase.com/docs/guides/api/securing-your-api)
