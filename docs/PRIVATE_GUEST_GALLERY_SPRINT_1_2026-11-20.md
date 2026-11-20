# MAGIC CREATIONS — Private Guest Gallery Sprint 1
Date: 2026-11-20
Branch: ceo/project-completion-2026-11-18
Status: source preparation only; not deployed or applied to production.

## Implemented source
- Added `assets/js/mc-guest-gallery.js` for owner-only listing, 5-minute signed previews, and approve/reject moderation.
- Added a database migration proposal for `guest_gallery_submissions`, invitation-owner RLS, and the private object path convention.
- The client deliberately has no guest upload method, no public bucket URL, and no permanent delete method.

## Security design
- Required bucket: `mc-guest-gallery-private` (private; not created).
- Required object path: `<invitation_uuid>/<submission_uuid>/<random-file>.jpg`.
- Guest upload must go through a trusted Edge Function. That function must hash and validate the guest token against `guest_invitation_tokens`, verify expiry/revocation and invitation/guest relationship, apply rate limits and file validation, then upload with server-side credentials.
- Guest submissions remain pending until owner approval. Only approved media may later be exposed in the public invitation through a separately generated, moderated public rendition or controlled public URL.
- No guest phone number is returned to the browser module.

## Not completed / blockers
- Migration proposal has NOT been executed.
- Private Storage bucket and Storage RLS policies have NOT been created.
- Guest verification/upload Edge Function has NOT been implemented.
- QR code generation/printing, OTP delivery, abuse prevention, owner UI wiring, and public approved-gallery rendering remain outstanding.
- No real guest upload, signed preview, moderation, cross-account denial, or browser/mobile QA was run.

## Required before activation
1. Review and approve the migration and private bucket creation.
2. Implement and test the Edge Function using the existing token lifecycle safely; do not trust guest-supplied invitation/guest IDs.
3. Add bucket-level size/MIME restrictions and Storage RLS.
4. Wire the workspace Guest Gallery view to this module and test with two separate customer accounts and an invited guest.
5. Keep the existing public `mc-invitation-media` bucket for invitation assets only; never place guest-submitted/private photos there.
