# MAGIC CREATIONS — Guest Gallery Staging Test Runbook
Date: 2026-11-24
Status: preparation only — NOT executed

## Goal

Validate the private Guest Gallery database, private Storage bucket, owner moderation, and guest upload path in a disposable/staging Supabase project before any production rollout.

## Safety rules

- Use a separate staging Supabase project with synthetic invitations and guest records. Do not point tests at production.
- Do not copy production guest names, phone numbers, tokens, photos, or other personal data into staging.
- Keep the staging project's secret/service-role key in server-side secrets only. Never put it in HTML, JavaScript, GitHub, or test screenshots.
- The migration proposal is source-controlled but is not applied to production. The bucket and Edge Functions are not deployed in production.
- Do not use the SQL editor against production for this runbook.

## Staging prerequisites

1. Create or select a disposable Supabase staging project.
2. Confirm the Data API is enabled and the schema used by the owner page is exposed. Since the owner moderation page calls `public.guest_gallery_submissions` via supabase-js, ensure the table has explicit authenticated grants and RLS after migration. Supabase changed the default exposure behavior for new public tables on 2026-10-30.
3. Apply the reviewed SQL proposal to staging only.
4. Create bucket `mc-guest-gallery-private` as private, with 8 MiB max file size and MIME allowlist `image/jpeg`, `image/png`, `image/webp`.
5. Deploy `guest-lookup` and `guest-gallery-upload` to staging only, with gateway JWT verification configured according to each function's own token-auth design.
6. Configure the Edge Function server secret securely. Confirm the function reads the configured secret value; do not print it in logs.
7. Create two synthetic owner accounts, two invitations (one per owner), and at least one synthetic guest for each invitation. Publish only the invitation used in positive upload tests.

## Test cases and expected outcomes

| ID | Test | Expected |
|---|---|---|
| ST-01 | Owner A lists their invitation submissions | Only Owner A rows returned |
| ST-02 | Owner A queries Owner B invitation ID | Empty result / denied by RLS |
| ST-03 | Owner A attempts to moderate Owner B submission | No row updated |
| ST-04 | Owner A attempts to set status to pending or omit reviewed_at | Rejected by RLS |
| ST-05 | Owner A approves/rejects own pending submission | Status and reviewed_at saved |
| ST-06 | Anonymous client reads gallery table | Denied |
| ST-07 | Anonymous client reads private object | Denied |
| ST-08 | Owner A creates signed preview for own object | Short-lived URL works |
| ST-09 | Owner A requests signed preview for Owner B object | Denied |
| ST-10 | Valid guest token, matching guest and published invitation | Upload accepted as pending |
| ST-11 | Expired or revoked token | 401; no object or submission |
| ST-12 | Token paired with wrong guest/invitation | 401; no object or submission |
| ST-13 | Unpublished invitation | 403; no object or submission |
| ST-14 | Invalid token shape / unknown token | 401; no object or submission |
| ST-15 | Sixth upload attempt within 15 minutes for one token | 429 |
| ST-16 | File larger than 8 MiB | 413; no object or submission |
| ST-17 | MIME does not match JPG/PNG/WebP signature | 415; no object or submission |
| ST-18 | Empty body | 400 |
| ST-19 | DB insert fails after object upload | Uploaded object is removed |
| ST-20 | CORS request from approved Pages origin | Correct origin header returned |
| ST-21 | CORS request from unapproved browser origin | 403 / no allow-origin header |
| ST-22 | No-Origin server-to-server request with valid token | Allowed by origin gate; token validation still required |

## Migration-specific review notes

- Owner moderation can now only set a row to `approved` or `rejected`, and `reviewed_at` must be non-null. This prevents the browser role from resetting a moderated row to `pending` through a direct API request.
- The service-only rate-limit RPC is `SECURITY INVOKER`, uses an empty search_path, and is not executable by `anon` or `authenticated`.
- The submissions table is readable only by the invitation owner through RLS. The browser does not receive Storage write privileges.
- The private bucket has no anonymous read policy. The Edge Function uses the server secret to upload; the owner uses signed URLs for previews.
- Header signature checks do not decode or sanitize image contents. Add decode/re-encode and malware/content scanning before any approved image is rendered publicly.

## Evidence to capture

For each test, record timestamp, test ID, synthetic owner/invitation IDs, HTTP status or SQL result, and pass/fail. Never capture or store raw guest tokens, secret keys, or private photo URLs in a public issue or repository.

## Exit criteria

Do not consider the feature ready until all tests pass, cross-owner tests prove isolation, no anonymous access is possible, Security Advisors are reviewed, and real mobile browser tests pass. Only then prepare a separate production change plan for explicit approval.

## Relevant official guidance

- Data API grants, exposed schemas, and RLS: https://supabase.com/docs/guides/api/securing-your-api
- Private buckets and access control: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase changelog — public tables no longer auto-exposed by default, enforced across projects from 2026-10-30: https://supabase.com/changelog/2026-04-28-data-api-exposure
