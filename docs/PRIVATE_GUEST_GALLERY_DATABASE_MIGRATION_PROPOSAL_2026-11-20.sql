-- MAGIC CREATIONS — private guest gallery schema proposal.
-- NOT APPLIED to production. Create the private Storage bucket through the
-- Supabase Storage API/dashboard after explicit approval; never insert into
-- storage.buckets directly.
-- Required bucket: mc-guest-gallery-private (private, 8 MB max,
-- MIME allowlist image/jpeg, image/png, image/webp).
-- Guest object path: <invitation_uuid>/<submission_uuid>/<random-file>.<ext>
-- Uploads are performed only by the trusted Edge Function with a server secret.

create table if not exists public.guest_gallery_submissions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  guest_display_name text not null default '',
  storage_path text not null unique,
  caption text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint guest_gallery_path_matches_invitation check (storage_path like invitation_id::text || '/%')
);
create index if not exists guest_gallery_invitation_status_created_idx
  on public.guest_gallery_submissions (invitation_id, status, created_at desc);

alter table public.guest_gallery_submissions enable row level security;
revoke all on table public.guest_gallery_submissions from anon, authenticated;
grant select on table public.guest_gallery_submissions to authenticated;
grant update (status, reviewed_at) on table public.guest_gallery_submissions to authenticated;
grant all on table public.guest_gallery_submissions to service_role;

drop policy if exists "guest gallery owner read" on public.guest_gallery_submissions;
create policy "guest gallery owner read" on public.guest_gallery_submissions
  for select to authenticated using (
    exists (select 1 from public.invitations i
      where i.id = guest_gallery_submissions.invitation_id and i.owner_id = (select auth.uid()))
  );
drop policy if exists "guest gallery owner moderate" on public.guest_gallery_submissions;
create policy "guest gallery owner moderate" on public.guest_gallery_submissions
  for update to authenticated
  using (exists (select 1 from public.invitations i
    where i.id = guest_gallery_submissions.invitation_id and i.owner_id = (select auth.uid())))
  with check (
    status in ('approved', 'rejected')
    and reviewed_at is not null
    and exists (select 1 from public.invitations i
      where i.id = guest_gallery_submissions.invitation_id and i.owner_id = (select auth.uid()))
  );

-- Separate per-token upload throttling; not coupled to RSVP rate limits.
create table if not exists public.guest_gallery_rate_limits (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table public.guest_gallery_rate_limits enable row level security;
revoke all on table public.guest_gallery_rate_limits from anon, authenticated;
grant all on table public.guest_gallery_rate_limits to service_role;

-- Atomic rate-limit increment, callable only by the Edge Function service role.
create or replace function public.mc_consume_guest_gallery_upload_attempt(p_token_hash text)
returns integer language plpgsql security invoker set search_path = ''
as $function$
declare v_attempts integer;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid guest upload token.'; end if;
  insert into public.guest_gallery_rate_limits (token_hash, window_started_at, attempts)
  values (p_token_hash, now(), 1)
  on conflict (token_hash) do update
    set window_started_at = case
          when public.guest_gallery_rate_limits.window_started_at <= now() - interval '15 minutes' then now()
          else public.guest_gallery_rate_limits.window_started_at end,
        attempts = case
          when public.guest_gallery_rate_limits.window_started_at <= now() - interval '15 minutes' then 1
          else public.guest_gallery_rate_limits.attempts + 1 end
  returning attempts into v_attempts;
  return v_attempts;
end;
$function$;
revoke all on function public.mc_consume_guest_gallery_upload_attempt(text) from public, anon, authenticated;
grant execute on function public.mc_consume_guest_gallery_upload_attempt(text) to service_role;

-- Owners can create short-lived signed previews only for their own invitation folders.
drop policy if exists "guest gallery owner read private objects" on storage.objects;
create policy "guest gallery owner read private objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'mc-guest-gallery-private'
    and exists (select 1 from public.invitations i
      where i.id::text = (storage.foldername(name))[1] and i.owner_id = (select auth.uid()))
  );

-- No anon access policy is provided. The Edge Function verifies token hash,
-- expiry/revocation, guest/invitation match, publication, image type and size;
-- it inserts pending submissions. Public gallery rendering is not enabled.
