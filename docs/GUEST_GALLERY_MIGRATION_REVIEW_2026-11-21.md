# MAGIC CREATIONS — Guest Gallery Migration Review
Date: 2026-11-21
Branch: ceo/project-completion-2026-11-18

## Review result

The proposed `docs/PRIVATE_GUEST_GALLERY_DATABASE_MIGRATION_PROPOSAL_2026-11-20.sql` is structurally aligned with the live schema inspected on 2026-11-21:

- `public.invitations` exists and has UUID `id` and `owner_id`.
- `public.guests` exists and has UUID `id`, `invitation_id`, and `guest_name`.
- `public.guest_invitation_tokens` exists with `invitation_id`, `guest_id`, SHA-256 `token_hash`, expiry, and revocation fields.
- The proposed `guest_gallery_submissions` and `guest_gallery_rate_limits` tables do not exist.
- The `mc-guest-gallery-private` bucket does not exist. The only inspected bucket was `mc-invitation-media`, which is public.
- No Edge Functions were deployed at the time of the preceding production check.

The proposal's table columns match the owner moderation module's select/update fields. Its invitation-owner RLS predicates use the actual `invitations.owner_id` column. The upload rate-limit function is `SECURITY INVOKER`, has a fixed empty search_path, and its EXECUTE privilege is restricted to `service_role`; the rate-limit table is not granted to browser roles.

## Important deployment gate: Data API

The owner moderation page calls the table through supabase-js, so the new table must be reachable through the project's Data API. The migration explicitly grants authenticated SELECT and limited UPDATE, and enables RLS. Before rollout, confirm the Data API is enabled and `public` is an exposed schema. If the project uses a restrictive exposed-schema allowlist, include `public` or move the table and client access to an explicitly exposed API schema. Grants and RLS are separate controls; both must remain in place.

Current Supabase guidance: https://supabase.com/docs/guides/api/securing-your-api

## Storage requirements

Create `mc-guest-gallery-private` using the Storage Dashboard/API only after approval:
- Private bucket (not public)
- 8 MiB maximum object size
- MIME allowlist: `image/jpeg`, `image/png`, `image/webp`
- Apply the migration's owner-only `storage.objects` SELECT policy so owners can create short-lived signed previews for their own invitation folder.
- No anonymous object read policy.

Private bucket and signed URL guidance: https://supabase.com/docs/guides/storage/buckets/fundamentals

## Remaining security / QA items

1. Confirm the project's Data API enabled/exposed-schema settings before applying the migration.
2. Run Supabase Security Advisors after schema setup; inspect any new warnings.
3. Test the migration against a disposable/staging project before production.
4. Verify owner A cannot list, moderate, or sign previews for owner B's submissions.
5. Verify invalid, expired, revoked, wrong-guest, unpublished-invitation, oversized, spoofed-MIME, and rate-limited uploads are rejected.
6. Add image decode/re-encode and malware/content scanning before public display. Header signature checks alone do not prove an image is safe.
7. Verify cleanup behavior for failed DB inserts and orphaned Storage objects.
8. Complete real browser/mobile tests for token issuance, guest upload, owner moderation, and signed preview expiry.

## Approval boundary

This is a source review only. No production DDL, migration, bucket creation, secret configuration, Edge Function deployment, or live upload test was performed. Do not enable guest uploads until the migration and private bucket are installed and both required Edge Functions are deployed and tested.
