# Guest photo upload page — source sprint (2026-11-21)

Status: committed to the project branch as source only. It is not deployed and is not live until the database proposal, private bucket, server secret and Edge Functions are configured and tested.

## Added
- `guest-photo-upload.html`: guest-facing upload page.
- Reads a per-guest 64-character token and invitation slug from the personal link.
- Calls the existing `guest-lookup` Edge Function before displaying the form.
- Removes query parameters from the visible browser history after reading them; keeps the bearer token in page memory only.
- Accepts JPG, PNG and WebP, maximum 8 MiB, with an optional 160-character caption.
- Sends raw image bytes to `guest-gallery-upload`; displays pending-approval confirmation.
- Uses only the browser publishable key from `assets/js/supabase-client.js`; no service-role secret is present in browser code.
- Adds a no-referrer policy and avoids rendering guest-supplied text as HTML.

## Required link format
`guest-photo-upload.html?slug=INVITATION-SLUG&token=64_CHARACTER_GUEST_TOKEN`

The token must be issued by the authenticated owner using the existing `issue_guest_invitation_token(p_guest_id)` RPC after the guest row exists in Supabase. The raw token is returned once; do not store it in a public guest list or analytics. The current workspace's guest-management UI still uses its local guest model and does not yet issue this server token or generate this upload URL. Do not present the feature as fully integrated until that owner workflow is implemented.

## Identity and privacy limitation
The token is a high-entropy bearer invitation credential. The page does **not** perform SMS OTP or verify possession of the guest's phone number. Anyone who receives the personal link can use it until expiry/revocation. Do not describe this as mobile-number verification or OTP.

## Deployment gates
- Review and explicitly approve the private guest-gallery SQL migration proposal.
- Create the private storage bucket with file size and MIME restrictions.
- Verify the Edge Function's secret configuration. The server-only secret must never be sent to the browser.
- Deploy guest-lookup and guest-gallery-upload only after migration, bucket and secrets are ready.
- Add owner UI for issuing/revoking upload tokens and sharing the guest-photo link separately from the normal invitation URL.
- Test expiry, revocation, wrong slug, unpublished event, rate limits, file-size/MIME spoofing, storage privacy and cross-owner access.
- Add trusted image decode/re-encode and malware/content scanning before production launch.

## QA performed
Static source inspection confirms the page uses the current guest-lookup request contract and the upload endpoint's raw-byte/header contract, uses the existing public publishable key, and does not embed a server secret. No browser, backend, live database, QR, OTP, or deployment test has been performed.
