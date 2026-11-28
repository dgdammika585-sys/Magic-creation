# MAGIC CREATIONS — Media Management Gap Review
Date: 2026-11-19
Branch: ceo/project-completion-2026-11-18

## Scope
Read-only source review of `event-workspace.html` and the previously completed Storage security gate. No production, database, bucket, or RLS changes were made.

## Current implementation verified
- The workspace has a Media Management view (also used by the Gallery step).
- Gallery supports up to 20 image files per event.
- Images are compressed in the browser to a maximum data URL length of approximately 9,000 characters, then stored in the event object in browser localStorage.
- A gallery image can be selected as the cover; removing the cover image clears the associated hero image data.
- The UI itself states that a shared cloud gallery needs a production backend.
- Section artwork/photo controls exist separately for invitation sections.
- Welcome media currently exposes a URL field; it is not a customer video-file upload control.
- No dedicated opening-video upload or music-file upload control was found in the reviewed Media Management view.
- No cloud Storage upload call is wired into this Media Management flow.

## Risks / limitations
1. Browser-local data is device/browser-specific and is not a cloud backup.
2. Data URLs stored in localStorage can consume browser quota and may be lost when browser data is cleared.
3. A local preview must not be labelled as a successful cloud upload.
4. The existing Supabase bucket `mc-invitation-media` was found public, with no MIME allow-list, no file-size cap, and no Storage policies returned by the read-only audit. Do not enable upload until policy and bucket controls are approved and tested.
5. Public bucket visibility means an uploaded asset URL can be retrieved by anyone who has it; guest/private uploads need a deliberate access model.

## Recommended Media Management product design
Create four clearly separated asset groups:
- Invitation gallery: photos, max 20; choose cover; reorder; remove.
- Opening media: one opening image OR one opening video; show supported format and size before selection.
- Background music: one audio track; manual play only; preview/pause/remove.
- Section artwork: optional image per supported invitation section.

For every selected asset, show filename, type, file size, preview, and explicit state:
- Selected locally (not uploaded)
- Uploading
- Uploaded
- Upload failed

Do not show Uploaded until the Storage API confirms success. Preserve the existing local gallery only as a temporary draft experience and clearly explain that it is not synced.

## Proposed technical gates before cloud upload
- Confirm whether customer login is mandatory for all uploads.
- Agree on public invitation media versus private guest submissions.
- Apply MIME allow-lists and per-bucket size limits.
- Enforce authenticated per-user folder ownership and invitation ownership.
- Use random object names and `upsert: false`.
- Test unauthorized upload, cross-user folder access, invalid MIME, oversized file, and successful owner upload.
- Only then wire browser upload and persist returned object paths/URLs.

## Approval required
No Storage policy, bucket setting, database schema, migration, or production configuration was changed. The previously proposed invitation workspace JSONB migration remains unapproved. Proceeding to cloud upload requires explicit approval for the exact Storage policy and bucket restrictions after presenting their final values.

## QA status
Source inspection only. No live browser interaction, real file upload, cloud persistence, or production deployment was tested.
