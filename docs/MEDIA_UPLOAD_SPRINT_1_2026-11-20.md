# MAGIC CREATIONS — Media Upload Sprint 1
Date: 20 November 2026
Branch: `ceo/project-completion-2026-11-18`

## Delivered in source
- Added `assets/js/mc-media-storage.js` using the existing Supabase browser client and publishable key only.
- Uploads require a signed-in Supabase customer and use owner-scoped paths:
  `{auth.uid()}/{invitation-slug}/{kind}/{random-id}.{ext}`.
- File validation in the browser:
  - Images: JPG, PNG, WebP, GIF; maximum 15 MB each.
  - Video: MP4 only; maximum 100 MB.
  - Music: MP3, WAV, OGG; maximum 20 MB.
- Uses non-overwriting object names and explicit content types.
- Added Media Management controls for gallery photos, welcome MP4 video and invitation music.
- Connected built-in section photos, custom-section photos and the welcome-media wizard upload to the same cloud Storage service.
- Updated the welcome wizard guidance to match the supported formats and explain public URL visibility.
- Added removal actions for owner-owned uploaded media.
- Gallery now displays uploaded public URLs in the editor and in the public invitation renderer.
- Public invitation allowlist now includes welcome media kind and music display name; internal Storage object paths are excluded from public snapshots.
- Existing invitation workspace cloud save continues to store metadata/URLs rather than file bytes.

## Live Supabase configuration verified read-only
Project: `yidsydqmiodolhgftypv`
Bucket: `mc-invitation-media`
- Bucket is public.
- Bucket file-size limit is currently unset.
- Bucket MIME allowlist is currently unset.
- Owner-folder INSERT, UPDATE and DELETE policies exist for authenticated users.
- The owner-folder check matches the new upload path convention.

## Important privacy and release limitations
- Because this bucket is public, a successfully uploaded object can be viewed by anyone who obtains its URL. The new UI warns customers before they upload. Only use it for media intended for the public invitation.
- Guest Gallery photos, private customer documents and unapproved guest submissions must use a separate private bucket and moderation flow. That is not implemented in this sprint.
- No live file upload was attempted: a real customer sign-in/session and an explicit browser upload are required. Therefore authentication, actual transfer, playback, deletion, cross-account denial and mobile-device behaviour are not claimed as tested.
- The existing bucket's global MIME and file-size settings were not changed. The 15/100/20 MB limits and accepted MIME types are enforced in the new frontend module only; backend bucket-level limits remain unset until a separate approved storage configuration change.
- Cloudflare deployment remains blocked by the previously observed failed Workers Build check. These commits are on the working branch and are not live on the public site.

## QA performed
- Re-fetched changed files from GitHub after commits.
- Confirmed upload service calls Supabase Storage upload and verifies authenticated owner path before deletion.
- Confirmed existing bucket visibility and policies with read-only SQL queries.
- Confirmed public gallery rendering supports URL-based media while retaining legacy local image fallback.
- No browser E2E, real upload, production deployment, or security penetration test was run.

## Follow-up
1. Obtain approval for bucket-level MIME/file-size limits and a separate private guest-media bucket.
2. Test upload and delete with a real customer account, plus cross-account denial.
3. Verify MP4/music playback in every invitation template and mobile browser.
4. Connect section photos and remaining wizard media upload controls to the same Storage service.
5. Implement private guest gallery upload, invited-mobile verification and owner moderation.
6. Re-run Cloudflare build and full release QA before merge/deploy.

## Additional read-only security advisor check
The current Supabase Security Advisor still reports:
- Two INFO findings: RLS-enabled internal tables `guest_invitation_tokens` and `guest_rsvp_rate_limits` have no policies.
- Two WARN findings: legacy anonymous-callable SECURITY DEFINER RPCs `mc_get_public_invitation` and `mc_submit_rsvp`.
- Five WARN findings: authenticated-callable SECURITY DEFINER functions `assign_guest_table`, `is_magic_creations_admin`, `issue_guest_invitation_token`, and the two legacy RPCs.
These functions were not modified in this sprint because their current application callers and intended access model need tracing before changing permissions.
