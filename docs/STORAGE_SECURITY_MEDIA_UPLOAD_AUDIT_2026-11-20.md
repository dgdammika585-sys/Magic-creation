# MAGIC CREATIONS — Storage Security & Media Upload Audit
Date: 2026-11-20
Branch: ceo/project-completion-2026-11-18
Scope: read-only audit. No bucket settings, policies, database schema, or production files were changed.

## Executive finding
The existing `mc-invitation-media` bucket is PUBLIC and currently has no per-bucket file-size limit and no MIME allow-list. Public means anyone who has an object's URL can retrieve it. Upload, update, and delete are still controlled by Storage RLS policies.

## Live project findings
Project: `yidsydqmiodolhgftypv`

Bucket:
- ID: `mc-invitation-media`
- public: `true`
- file_size_limit: `NULL` (no bucket-specific limit)
- allowed_mime_types: `NULL` (no MIME restriction)

Current `storage.objects` policies for this bucket:
- INSERT `Owners upload invitation media`: authenticated; bucket must match; first path folder must equal `auth.uid()`.
- UPDATE `Owners update invitation media`: authenticated; same owner-folder check in both USING and WITH CHECK.
- DELETE `Owners delete invitation media`: authenticated; same owner-folder check.
- No SELECT policy was found. This is consistent with a public bucket: public object retrieval bypasses Storage RLS, while management operations remain protected.

## Product implications
1. Do not place private guest photos, unapproved gallery uploads, identity documents, or confidential material in this public bucket.
2. Public invitation assets (cover images, invitation video/audio) can use this bucket only when the customer understands that published media URLs are publicly retrievable.
3. The existing path convention must remain `{auth.uid()}/...` for owner upload/update/delete rules to match.
4. A public bucket is not a substitute for invitation-level authorization. Unpublished/private assets should not be uploaded here if they must remain confidential.

## Recommended target design (proposal only)
### A. Existing public bucket — invitation assets
Keep public retrieval for assets intentionally embedded in published invitation pages, but configure:
- Per-file size cap: start at 25 MB pending confirmation of the project's global Storage limit and product requirements.
- Explicit allow-list: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `audio/mpeg`, `audio/mp4`, `audio/ogg`, `audio/wav`.
- Continue authenticated owner-folder INSERT/UPDATE/DELETE rules.
- Use generated object names (not raw customer filenames), and store only the resulting public URL/path in invitation data.
- Validate MIME type and file size in the browser for friendly feedback; bucket restrictions remain the server-side enforcement.

### B. Guest Gallery uploads — separate private bucket
Create a separate PRIVATE bucket only when the guest upload approval flow is ready. Guest uploads must remain private until the invitation owner approves them. The public invitation page should receive only approved asset URLs, through an explicitly designed delivery mechanism. Do not make the existing public bucket serve as an unreviewed guest upload inbox.

### C. Upload UX
- Images: JPEG/PNG/WebP; compress before upload; show progress and retry.
- Video: MP4 only initially; use resumable/TUS upload for files above 6 MB.
- Audio: MP3/M4A/Ogg/WAV as supported by browsers; user-initiated playback only.
- Validate maximum size, actual file type, upload errors, and ownership.
- Delete replaced files only after the new upload succeeds; avoid orphaning existing invitation media.
- Store object paths in workspace data; derive public URLs using the Storage SDK.

## Required decision before any Storage mutation
Changing the existing bucket from PUBLIC to PRIVATE would break public delivery for already-published invitation assets. Therefore this audit does not change its access model.
Before applying settings, confirm:
- Whether customers may upload MP4 video and audio, or images only in the first release.
- The desired per-file limit. Recommended starting point is 25 MB per file, subject to the project's global limit.
- That the existing bucket remains public for intentionally published invitation media.

## Verification still required
- Test authenticated owner upload succeeds under `{user_id}/{slug}/...`.
- Test a second account cannot overwrite or delete the first owner's files.
- Test anonymous retrieval succeeds only for intentionally public media.
- Test disallowed MIME and oversized files are rejected by Storage.
- Test replacing media and cleanup without deleting the previous asset prematurely.
- Test guest gallery remains private until owner approval.

## References
- Supabase Storage Access Control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage Buckets: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase Creating Buckets / MIME and size restrictions: https://supabase.com/docs/guides/storage/buckets/creating-buckets
- Supabase File Limits: https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase Standard Uploads and TUS guidance: https://supabase.com/docs/guides/storage/uploads/standard-uploads
