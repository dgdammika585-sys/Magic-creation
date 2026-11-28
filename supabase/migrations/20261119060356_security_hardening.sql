-- MAGIC CREATIONS — production hardening pass 1
-- Apply only after supabase-schema.sql and the existing 20261106 migrations.
-- Review and test on a non-production Supabase project before production rollout.

begin;

-- Customers may submit an order request, but the browser must not choose its
-- price, approval state, order number, or internal admin note.
revoke insert on table public.orders from authenticated;
grant insert (customer_id, invitation_id, service_type, customer_note)
  on table public.orders to authenticated;

drop policy if exists "orders customer insert" on public.orders;
create policy "orders customer insert" on public.orders
for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and (
    invitation_id is null
    or exists (
      select 1
        from public.invitations i
       where i.id = invitation_id
         and i.owner_id = (select auth.uid())
    )
  )
);

-- A guest row must remain attached to an invitation owned by the same user.
-- This closes a cross-event reassignment gap in the earlier update policy.
drop policy if exists "guests owner update" on public.guests;
create policy "guests owner update" on public.guests
for update to authenticated
using (
  (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.invitations i
       where i.id = invitation_id and i.owner_id = (select auth.uid())
    )
  )
  or public.is_magic_creations_admin()
)
with check (
  (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.invitations i
       where i.id = invitation_id and i.owner_id = (select auth.uid())
    )
  )
  or public.is_magic_creations_admin()
);

-- Event owners need to see pending guest-book entries and moderate them.
drop policy if exists "invitation owners read guestbook submissions" on public.guestbook_entries;
create policy "invitation owners read guestbook submissions" on public.guestbook_entries
for select to authenticated
using (
  exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
  or public.is_magic_creations_admin()
);

drop policy if exists "invitation owners moderate guestbook" on public.guestbook_entries;
create policy "invitation owners moderate guestbook" on public.guestbook_entries
for update to authenticated
using (
  exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
  or public.is_magic_creations_admin()
)
with check (
  exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
  or public.is_magic_creations_admin()
);

drop policy if exists "invitation owners delete guestbook" on public.guestbook_entries;
create policy "invitation owners delete guestbook" on public.guestbook_entries
for delete to authenticated
using (
  exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
  or public.is_magic_creations_admin()
);

grant update, delete on public.guestbook_entries to authenticated;

-- Public guest-book posts are accepted only for published invitations and
-- must have bounded name/message lengths. They remain unapproved by default.
drop policy if exists "public submit wish" on public.guestbook_entries;
create policy "public submit wish" on public.guestbook_entries
for insert to anon, authenticated
with check (
  approved = false
  and length(trim(coalesce(guest_name, ''))) between 1 and 120
  and length(trim(message)) between 1 and 1000
  and exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.published = true
  )
);

-- Per-token RSVP throttling: maximum 8 submissions per 15-minute window.
-- Only the server-side service role can read/write this table.
create table if not exists public.guest_rsvp_rate_limits (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);

alter table public.guest_rsvp_rate_limits enable row level security;
revoke all on public.guest_rsvp_rate_limits from public, anon, authenticated;
grant all on public.guest_rsvp_rate_limits to service_role;

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

  if not found then
    select g.rsvp_status into v_status
      from public.guests g where g.id = v_guest_id;
    return jsonb_build_object(
      'saved', true, 'idempotent', true,
      'guest_name', v_guest_name, 'rsvp_status', v_status
    );
  end if;

  update public.guests
     set rsvp_status = p_response,
         rsvp_responded_at = now()
   where id = v_guest_id;

  return jsonb_build_object(
    'saved', true, 'idempotent', false,
    'guest_name', v_guest_name,
    'guest_count', v_guest_count,
    'rsvp_status', p_response
  );
end;
$$;

revoke all on function public.submit_guest_rsvp(text, text, uuid) from public, anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, uuid) to service_role;

commit;
