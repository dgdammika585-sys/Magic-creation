-- MAGIC CREATIONS — private guest gallery schema proposal.
-- NOT APPLIED to production. Create the private Storage bucket through the
-- Supabase Storage API/dashboard after explicit approval; never insert into
-- storage.buckets directly.
--
-- Required private bucket id: mc-guest-gallery-private
-- Guest upload path: <invitation_uuid>/<submission_uuid>/<random-file>.jpg
-- Only a trusted Edge Function may accept a verified guest token and upload.
-- Never expose a service-role key in browser code.

create table if not exists public.guest_gallery_submissions (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  guest_display_name text not null default '',
  storage_path text not null unique,
  caption text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint guest_gallery_path_matches_invitation
    check (storage_path like invitation_id::text || '/%')
);

create index if not exists guest_gallery_invitation_status_created_idx
  on public.guest_gallery_submissions (invitation_id, status, created_at desc);

alter table public.guest_gallery_submissions enable row level security;

revoke all on table public.guest_gallery_submissions from anon, authenticated;
grant select on table public.guest_gallery_submissions to authenticated;
grant update (status, reviewed_at) on table public.guest_gallery_submissions to authenticated;

drop policy if exists "guest gallery owner read" on public.guest_gallery_submissions;
create policy "guest gallery owner read"
  on public.guest_gallery_submissions
  for select to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = guest_gallery_submissions.invitation_id
        and i.owner_id = (select auth.uid())
    )
  );

drop policy if exists "guest gallery owner moderate" on public.guest_gallery_submissions;
create policy "guest gallery owner moderate"
  on public.guest_gallery_submissions
  for update to authenticated
  using (
    exists (
      select 1 from public.invitations i
      where i.id = guest_gallery_submissions.invitation_id
        and i.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.invitations i
      where i.id = guest_gallery_submissions.invitation_id
        and i.owner_id = (select auth.uid())
    )
  );

-- No anon INSERT/SELECT/UPDATE policy is provided.
-- The Edge Function will insert after checking a hashed, unexpired, unrevoked
-- guest_invitation_tokens row and matching the invitation/guest. It should
-- validate MIME, byte size, image decoding, rate limits, and path construction.
-- Configure Storage policies only after creating the private bucket:
--
-- SELECT for authenticated owners:
--   bucket_id = 'mc-guest-gallery-private'
--   AND (storage.foldername(name))[1] is an invitation UUID owned by auth.uid()
-- DELETE must be performed by a trusted cleanup function to keep row/object
-- deletion atomic and avoid letting clients remove another guest's upload.
