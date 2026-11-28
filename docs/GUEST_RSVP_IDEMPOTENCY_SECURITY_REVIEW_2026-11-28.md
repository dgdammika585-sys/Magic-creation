# MAGIC CREATIONS — Guest RSVP Idempotency Security Review
**Date:** 28 November 2026  
**Branch:** `ceo/project-completion-2026-11-18`  
**Scope:** Static source review of the guest RSVP Edge Function and SQL migration chain. No live database changes.

## Reviewed components
- `supabase/functions/guest-rsvp/index.ts`
- `supabase/functions/_shared/common.ts`
- `supabase/migrations/20261119060313_guest_tokens_rsvp.sql`
- `supabase/migrations/20261119060356_security_hardening.sql`

## Existing controls confirmed in source
- Guest access token must be 64 lowercase hexadecimal characters and is SHA-256 hashed before database lookup.
- RSVP accepts only `attending` or `not_attending`.
- Request body is bounded by the shared JSON reader (8 KiB default).
- The SQL writer checks that the token is active, unexpired, and belongs to a guest in a published invitation.
- The later security-hardening migration adds per-token throttling: 8 submissions per 15-minute window; attempts above 8 return `rate_limited`.
- The Edge Function maps the SQL rate-limit result to HTTP 429.
- The RPC is revoked from public/anon/authenticated and granted to `service_role` only.

## Finding: request-id collision is not bound to the original RSVP
The SQL writer inserts an RSVP event using a globally unique `request_id` and `ON CONFLICT (request_id) DO NOTHING`. If that ID already exists, the function currently returns `saved: true, idempotent: true` after reading the current guest's status, without verifying that the existing event belongs to the same guest, invitation, and response.

This does not by itself disclose another guest's row, but it makes idempotency semantics unsafe: a reused/colliding request ID can be treated as a successful replay for a different guest or response, while silently skipping the requested update.

## Recommended correction (review only; not applied)
In a new, properly generated Supabase migration:
1. Keep the unique request ID constraint.
2. When the insert conflicts, fetch the existing `guest_rsvp_events` row by `request_id`.
3. Treat it as idempotent only if `guest_id`, `invitation_id`, and `response` all match the current validated request.
4. Otherwise raise a controlled conflict error (HTTP 409 from the Edge Function), without changing either guest's RSVP.
5. Add regression tests for same guest/same response replay, same guest/different response reuse, different guest reuse, and concurrent duplicate requests.

Suggested transaction behavior:
- New request ID: insert event and update guest status.
- Exact replay: return the original successful result without a second history row.
- Request ID reused for a different guest, invitation, or response: reject as conflict.

## Additional observations
- The guest-lookup endpoint has no explicit per-token request throttle in the reviewed source. Token entropy makes guessing impractical, but a separate lookup throttle/abuse control should be considered before public rollout.
- The shared CORS allowlist is restrictive and no-Origin server-to-server requests are accepted; CORS is not an authentication control.
- Do not expose the service secret in the browser. Keep Edge Function JWT verification disabled only because the function validates its own 256-bit guest token internally.

## Verification status
- Static source review only.
- No SQL was executed against Supabase.
- No migration was created or applied.
- No Edge Function was deployed.
- No browser or live RSVP tests were run.
- This review is not production approval.
