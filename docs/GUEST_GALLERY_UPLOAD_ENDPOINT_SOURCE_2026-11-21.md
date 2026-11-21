# Guest Gallery upload endpoint — source preparation

Status: source only; not deployed; migration not applied.

## Request contract

- POST to /functions/v1/guest-gallery-upload.
- Headers: apikey (publishable key), x-guest-token (64-character token), content-type (image/jpeg, image/png, or image/webp), optional x-caption.
- Body: raw image bytes, maximum 8 MiB.
- Gateway JWT verification is disabled because the caller authenticates with the per-guest invitation token. The handler hashes that token with SHA-256 and checks the existing guest_invitation_tokens row, expiry, revocation, guest/invitation match, and published invitation state.
- Uploads use the private mc-guest-gallery-private bucket and random object paths. Each submission is pending; nothing is publicly visible until owner approval and a separate public-gallery implementation exists.
- Per-token limit: 5 upload attempts per 15-minute window.

## Required setup before it can run

1. Review and explicitly approve the SQL proposal in PRIVATE_GUEST_GALLERY_DATABASE_MIGRATION_PROPOSAL_2026-11-20.sql.
2. Create mc-guest-gallery-private as a private bucket with 8 MiB maximum file size and MIME allowlist image/jpeg, image/png, image/webp.
3. Apply the reviewed migration and run Supabase Security Advisors.
4. Set and verify the Edge Function server-side secret key. The handler treats SUPABASE_SECRET_KEYS.default as the environment-variable name for the secret and reads that value server-side, or uses the legacy SUPABASE_SERVICE_ROLE_KEY fallback; neither value may be committed or sent to browsers.
5. Deploy the function only after the database, bucket, and secrets are ready.
6. Test valid, expired, revoked, wrong-guest, unpublished, oversized, MIME-spoofed, repeated, and cross-owner cases. Confirm private object access is denied to anon and non-owners and owner signed previews expire.

## Important limitations

- This validates file signatures and MIME declarations but does not decode/re-encode image pixels. Before production launch, add a trusted image decoder/re-encoder and malware/content scanning if available.
- No guest-facing QR/upload UI, phone confirmation/OTP, deletion/retention workflow, or approved-gallery public renderer is included in this sprint.
- This function is not deployable until the private bucket and migration exist.
