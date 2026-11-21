# MAGIC CREATIONS — Media Upload Security Gate
Date: 2026-11-19
Branch: `ceo/project-completion-2026-11-18`

## Decision
Do not enable customer uploads until Storage access control and bucket limits are configured and verified. The existing browser client uses the Supabase publishable key only; no service-role key is present in frontend code.

## Live read-only inspection
Project: `yidsydqmiodolhgftypv`

The existing bucket `mc-invitation-media` is:
- Public: true (anyone who has an asset URL can retrieve/serve the object)
- Per-bucket file size limit: unset
- Allowed MIME types: unset

The read-only `pg_policies` inspection returned no policies for `storage.objects` or `storage.buckets`. Supabase documents that uploads are denied by default until an appropriate Storage RLS policy exists. Public bucket status makes retrieval public; it does not make uploads public.

## Required before customer uploads
1. Agree an upload policy: authenticated customer only, object path begins with the authenticated user's UUID, then invitation identifier, then a generated filename.
2. Set a conservative per-bucket size cap and explicit MIME allow-list for image/video/audio types that the product will support. Confirm global project limit first.
3. Keep object names unique and use `upsert: false`; do not grant broad UPDATE/DELETE access.
4. Decide whether customer-uploaded media should be public by URL (current bucket model) or private with signed URLs. Wedding invitation assets are usually intentionally shareable, but user consent and guest-photo privacy must be considered separately.
5. Implement client-side type/size checks as usability controls, not as a replacement for server-side bucket restrictions and RLS.
6. Verify with two authenticated test accounts: own upload succeeds; a different account cannot upload into the first account's folder; anonymous upload fails; invalid MIME/oversize files fail; public read behaves according to the approved visibility model.

## Proposed minimal upload-only policy (NOT APPLIED)
If public-by-URL media is explicitly approved, an INSERT policy can restrict writes to authenticated users and their own top-level UUID folder:

```sql
create policy "MC customers upload to own media folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mc-invitation-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
```

This is only a proposal. It does not grant UPDATE, DELETE, or list access. A public bucket already permits object retrieval by URL. Avoid adding a blanket SELECT policy because that can expose object listing/metadata. If the application later needs list/update/delete, design those separately with owner and invitation authorization checks.

## Application integration plan after approval
- Add a media upload module using the existing Supabase browser client.
- Validate allowed MIME and maximum bytes before upload.
- Store under `<auth.uid()>/<invitation-id>/<random-file-name>`.
- Use `upsert: false`, set the content type explicitly, and return the public URL only if public delivery is approved.
- Save URL and media role (hero/gallery/music/video) in the invitation workspace data only after the approved persistence path is available.
- Connect the uploader to Media Management and Invitation Layout; keep a local preview before save.
- Use resumable uploads for larger video files; Supabase recommends TUS for files over 6 MB.

## Approval boundary
No SQL, Storage policy, bucket configuration, schema, or production change was made in this sprint. The previously unapproved `invitations.workspace_data` migration remains unapproved and is not part of this report.
