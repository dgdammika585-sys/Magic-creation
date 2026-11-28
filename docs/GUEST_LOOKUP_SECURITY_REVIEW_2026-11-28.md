# MAGIC CREATIONS — Guest Lookup Security Review
Date: 2026-11-28
Branch: `ceo/project-completion-2026-11-18`

## Scope
Reviewed:
- `supabase/functions/guest-lookup/index.ts`
- `supabase/functions/_shared/common.ts`
- `guest-photo-upload.html`
- `supabase/config.toml`
- Existing RSVP rate-limit implementation in `supabase/migrations/20261119060356_security_hardening.sql`

This is a source review only. No database migration was created or applied, no Edge Function was deployed, and no live requests were sent.

## Existing controls confirmed
- Guest tokens are 256-bit random values represented as 64 lowercase hexadecimal characters.
- The lookup function validates the token format and hashes the raw token with SHA-256 before querying `guest_invitation_tokens`.
- Revoked and expired tokens are rejected.
- Invitation lookup is scoped to the token's invitation ID, the supplied slug, and `published = true`.
- Guest lookup is scoped to both the token's guest ID and invitation ID.
- Table name is returned only when the invitation enables guest table display and the guest RSVP status is `attending`.
- Shared JSON parsing enforces an 8 KiB request-body limit.
- CORS uses an explicit origin allowlist. Requests without an Origin header are accepted for server-to-server use; CORS is not authentication.
- `guest-lookup` has `verify_jwt = false`, which is expected for this bearer-token flow only because the function validates the high-entropy guest token itself. The Supabase server secret remains server-side.

## Findings

### 1. Guest lookup has no endpoint-specific rate limit
The function performs token, invitation, guest, and sometimes seating-table lookups on every valid request. Unlike RSVP and the proposed gallery upload flow, no per-token lookup throttle is visible in the reviewed function or shared helper.

Risk: a leaked guest link can be replayed repeatedly, increasing database/API load and allowing repeated retrieval of the same guest invitation details.

Recommended remediation:
1. Add a server-managed `guest_lookup_rate_limits` table keyed by the SHA-256 token hash.
2. Add a small atomic Postgres RPC to consume an attempt, using an upsert/row lock so concurrent requests cannot bypass the limit.
3. Suggested initial policy: allow 30 lookups per 15-minute window per token; return HTTP 429 after the limit. Tune using real traffic after staging tests.
4. Revoke table access from `public`, `anon`, and `authenticated`; grant table access and RPC execution only to `service_role`.
5. Keep the function's response body generic for rate-limit failures. Do not trust arbitrary client-supplied `X-Forwarded-For` values as an IP identity. If IP-based throttling is later added, use only a platform-documented, trusted client-IP source.
6. Add staging tests for limit boundary, concurrent requests, window reset, unknown token, expired/revoked token, and cross-invitation token/slug mismatch.

### 2. Bearer token remained in the URL on early validation failures
Previously, `history.replaceState` ran only inside the branch where both token and slug passed client-side validation. A malformed slug paired with a valid token therefore left the raw bearer token in the address bar and current history entry.

Status: fixed in this review. The page now removes the query string and fragment immediately after reading the token and slug into memory, before validation or network requests. The `no-referrer` meta policy remains in place.

## Static verification
- Token is copied into memory before the URL is cleaned: PASS.
- URL cleanup executes unconditionally before the validation branch: PASS.
- The old conditional URL-cleanup call was removed: PASS.
- Server-side token hashing, expiry/revocation checks and invitation/guest scoping remain unchanged: PASS.
- No secrets or raw tokens were added to source code: PASS.

These checks inspect source text only. They do not replace browser history/referrer tests or staging database tests.

## Release gates
- Implement the lookup rate-limit table/RPC through the repository's valid Supabase migration workflow. The Supabase skill requires creating migrations with `supabase migration new <name>`; do not invent a timestamped migration filename.
- The current environment has not established an available local Supabase CLI/repository checkout, so this review intentionally does not add a hand-named migration.
- Test on a non-production project before applying any production DDL or deploying functions.
- Confirm Supabase Data API exposure and grants separately from RLS where relevant.
- Keep production deployment, secret changes, migration application, and PR merge behind explicit approval.

## Supabase references
- [Supabase Production Checklist — rate limiting and abuse prevention](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase Changelog — breaking changes](https://supabase.com/changelog?types=breaking-change)
