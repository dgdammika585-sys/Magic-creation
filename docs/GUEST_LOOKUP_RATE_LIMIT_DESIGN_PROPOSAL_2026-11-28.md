# MAGIC CREATIONS — Guest Lookup Rate-Limit Design Proposal
Date: 2026-11-28
Branch: `ceo/project-completion-2026-11-18`

## Status and scope
Design proposal only. This is not an executable migration and is not deployed.

The reviewed `guest-lookup` Edge Function validates a 64-character bearer token, hashes it, verifies the token row, then reads the published invitation and guest record (and sometimes a seating-table row). There is currently no endpoint-specific per-token throttle.

The linked Supabase project `yidsydqmiodolhgftypv` was reported as `INACTIVE` at review time. No SQL was executed, no migration was generated/applied, and no Edge Function was deployed.

## Recommended initial policy
- Key: SHA-256 hash of the guest bearer token; never store the raw token.
- Window: rolling fixed window of 15 minutes.
- Allowance: 30 successful-token lookup attempts per window.
- Response after limit: HTTP 429 with a generic message and a `Retry-After` value derived from the active window.
- Do not include guest names, invitation identifiers, token hashes, or rate-limit internals in the response.
- Do not trust arbitrary `X-Forwarded-For` or other client-supplied IP headers. This proposal is per-token only.
- Tune 30/15 minutes using staging traffic before release.

## Request sequence
1. Enforce method, CORS, bounded JSON body, token format, and slug format as today.
2. Hash the supplied token with SHA-256.
3. Query `guest_invitation_tokens` and reject unknown, revoked, or expired tokens using the existing generic response.
4. Only after confirming a valid active token, call a private atomic RPC with the token hash to consume one lookup attempt. This avoids allowing arbitrary unknown tokens to populate the rate-limit table.
5. If the RPC says the limit is exceeded, return HTTP 429 before querying invitation, guest, or seating data.
6. Continue the existing invitation/slug/published and guest/invitation scoping checks unchanged.
7. Keep all server secrets in Edge Function environment variables; never expose them to the browser.

Note: per-token throttling does not prevent repeated database reads of the token row itself. If staging reveals abuse from invalid random tokens, add a separate platform-trusted IP or gateway control only after confirming the platform's documented client-IP header. Never derive an identity from a caller-controlled header.

## Proposed database shape (design, not migration)
```sql
create table public.guest_lookup_rate_limits (
  token_hash text primary key
    check (token_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null check (attempts >= 0)
);

alter table public.guest_lookup_rate_limits enable row level security;
revoke all on public.guest_lookup_rate_limits from public, anon, authenticated;
grant all on public.guest_lookup_rate_limits to service_role;
```

The table must not be exposed to browser roles. RLS is defense in depth; grants and Data API exposure are separate controls.

## Atomic RPC requirements
Implement a narrowly scoped Postgres function (suggested name: `public.consume_guest_lookup_attempt(text)`) that:

- Rejects a value not matching the 64-character lowercase SHA-256 hex format.
- Uses a single `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement so concurrent requests for one token serialize on the primary-key row.
- Starts a new window and sets attempts to 1 when the stored window is at least 15 minutes old; otherwise increments attempts.
- Returns structured fields for `allowed`, `attempts`, and `retry_after_seconds` without exposing the token hash.
- Allows attempts 1 through 30 and rejects attempt 31 onward.
- Uses a fixed, empty search path and fully qualified object names if `SECURITY DEFINER` is required.
- Revokes execution from `PUBLIC`, `anon`, and `authenticated`; grants execution only to `service_role`.
- Is reviewed for safe ownership and privilege boundaries before use. Do not add broad `SECURITY DEFINER` privileges as a shortcut.

The RPC should return the active window's reset time (or a bounded retry duration) so the Edge Function can construct a standards-compliant `Retry-After` header. Avoid returning raw SQL errors to the guest.

## Retention and operational considerations
- One row remains per issued guest token; revoked/expired tokens may accumulate.
- Define a cleanup policy for rows whose token is revoked/expired or whose last window is older than the retention period (suggested 7 days).
- Prefer a controlled scheduled cleanup or owner-run maintenance task; do not add pg_cron or another extension without verifying project support and operational cost.
- Monitor 429 counts and lookup error rates after launch. Do not log raw tokens or full token-bearing URLs.
- Consider a stricter cap only after observing real usage; avoid locking out guests during a normal event.

## Required tests before release
1. Valid token: attempts 1 and 30 allowed.
2. Valid token: attempt 31 returns HTTP 429.
3. Concurrent requests at the boundary cannot exceed 30 allowed attempts.
4. A request after 15 minutes starts a fresh window.
5. Unknown token does not create a rate-limit row.
6. Expired and revoked tokens do not consume a rate-limit row.
7. Valid token with wrong slug is throttled after token validation and returns the existing generic invitation-unavailable response.
8. Token for invitation A cannot retrieve invitation B or a guest belonging to B.
9. Rate-limit table and RPC are inaccessible to `anon` and `authenticated`; service-role execution works.
10. HTTP 429 includes a safe `Retry-After` header and a generic body.
11. No raw token or token hash is returned to the client or written to logs.
12. Verify retention cleanup does not remove active-window rows.

## Implementation gates
- Refresh Supabase changelog and documentation immediately before implementation.
- Restore/verify the project is `ACTIVE_HEALTHY` before database operations.
- Use the repository's actual local checkout and Supabase CLI. Create a real migration only with `supabase migration new <descriptive-name>`; do not hand-name a timestamped migration.
- Review current schema, grants, function signatures, CLI version, and Data API exposure before writing DDL.
- Test on a non-production project first. No staging project should be created if it can incur cost without the user's explicit approval.
- Run security advisors and the full concurrency/authorization test set.
- Deploy only the `guest-lookup` function after its database prerequisites are verified.
- Production migration, secrets, function deployment, and PR merge require explicit approval.

## Current release state
This proposal does not make Guest Lookup production-ready. The Edge Function is not confirmed deployed, the Supabase project is inactive, and browser/staging tests remain outstanding.
