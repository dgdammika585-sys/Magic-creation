# Guest Gallery upload endpoint — source preparation

Status: source only; not deployed; migration not applied. Security hardening update: 2026-11-21.

## Request contract

- POST to /functions/v1/guest-gallery-upload.
- Headers: apikey (publishable key), x-guest-token (64-character token), content-type (image/jpeg, image/png, or image/webp), optional x-caption.
- Body: raw image bytes, maximum 8 MiB.
- Gateway JWT verification is disabled because the caller authenticates with the per-guest invitation token. The handler hashes that token with SHA-256 and checks the existing guest_invitation_tokens row, expiry, revocation, guest/invitation match, and published invitation state.
- Uploads use the private mc-guest-gallery-private bucket and random object paths. Each submission is pending; nothing is publicly visible until owner approval and a separate public-gallery implementation exists.
- Per-token limit: 5 upload attempts per 15-minute window. The function validates the bearer token, invitation and guest, then consumes the rate-limit allowance before reading the request body.
- CORS uses the same explicit GitHub Pages/local-development origin allowlist as the guest lookup endpoint; wildcard `*` is not used.
- `SUPABASE_SECRET_KEYS.default` is read as the secret key value itself, matching Supabase's current Edge Function secret-key documentation. The legacy `SUPABASE_SERVICE_ROLE_KEY` fallback remains server-only.

## Required setup before it can run

1. Review and explicitly approve the SQL proposal in PRIVATE_GUEST_GALLERY_DATABASE_MIGRATION_PROPOSAL_2026-11-20.sql.
2. Create mc-guest-gallery-private as a private bucket with 8 MiB maximum file size and MIME allowlist image/jpeg, image/png, image/webp.
3. Apply the reviewed migration and run Supabase Security Advisors.
4. In Supabase Data API settings, explicitly expose the new public table and RPC used by the Edge Function if they are not already exposed. New public-schema tables are no longer automatically exposed by default; keep the grants and RLS policies in this proposal in place.
5. Set and verify the Edge Function server-side secret key. The handler reads the `default` value from the JSON `SUPABASE_SECRET_KEYS` secret bag, or uses the legacy `SUPABASE_SERVICE_ROLE_KEY` fallback; neither value may be committed or sent to browsers.
6. Deploy the function only after the database, bucket, Data API exposure, and secrets are ready.
7. Test valid, expired, revoked, wrong-guest, unpublished, oversized, MIME-spoofed, repeated, and cross-owner cases. Confirm private object access is denied to anon and non-owners and owner signed previews expire.

## Important limitations

- This validates file signatures and MIME declarations but does not decode/re-encode image pixels. Before production launch, add a trusted image decoder/re-encoder and malware/content scanning if available.
- No guest-facing QR/upload UI, phone confirmation/OTP, deletion/retention workflow, or approved-gallery public renderer is included in this sprint.
- This function is not deployable until the private bucket and migration exist.


## Read-only production readiness check (2026-11-21)

- Supabase Edge Functions list is empty; neither `guest-lookup` nor `guest-gallery-upload` is deployed.
- `guest_gallery_submissions` and `guest_gallery_rate_limits` are absent from the public schema; the proposal migration is not applied.
- `mc-guest-gallery-private` does not exist. The existing `mc-invitation-media` bucket is public and has no file-size or MIME restrictions; it is not used for private guest uploads.
- The deployed migration history includes `guest_tokens_rsvp`, but this does not include the proposed private gallery schema.
- Therefore no upload function deployment or live upload test was attempted.
