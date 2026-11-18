# MAGIC CREATIONS — Initial Security Review

**Review date:** 2026-11-18  
**Scope:** `supabase-schema.sql`, migrations `202611060001_guest_tokens_rsvp.sql` and `202611060002_auth_profile_trigger.sql`, `guest-lookup`, `guest-rsvp`, and shared Edge Function utilities.  
**Environment:** Static source review only. No live Supabase project was accessed and no SQL was executed.

## Findings

| Priority | Finding | Risk | Current action |
|---|---|---|---|
| High | Authenticated customers had table-level INSERT on `orders`; the RLS check constrained customer ownership but did not constrain submitted `status`, `amount_lkr`, or `admin_note`. | Customers could attempt to set order approval/price/internal fields from a custom API request. | New migration revokes table INSERT and grants only customer-editable columns. Price calculation still needs a trusted server-side order flow. |
| High | Guest UPDATE policy checked `owner_id` but did not also verify that the updated `invitation_id` belongs to the same owner. | A crafted update could detach a guest row from the owner's event and associate it with another invitation. | New migration adds an invitation ownership check to the UPDATE policy. |
| Medium | Guest-book public insert policy accepted unapproved messages but did not require the target invitation to be published or bound guest-name length. | Unpublished events could receive public submissions; unbounded guest-name values could be stored. | New migration tightens the insert policy to published invitations and bounded name/message lengths. |
| High | The base schema exposed public guest-book insert but had no owner-facing SELECT/UPDATE/DELETE policies or grants for moderation. | Event owners could not reliably review and approve/remove submitted wishes through normal authenticated access. | New migration adds event-owner moderation policies and authenticated update/delete grants. |
| Medium | Guest RSVP Edge Function had validation and idempotency but no per-token request throttle in the reviewed source. | Repeated requests could create avoidable service load. | New migration adds a per-token limit of 8 attempts per 15-minute window; Edge Function maps throttling to HTTP 429. |
| Medium | The base schema exists as root-level `supabase-schema.sql`, while the Supabase migration directory contains later migrations that assume base tables already exist. | A fresh `supabase db push` may fail or leave environments inconsistent if baseline setup is not recorded/applied first. | Documented as a migration prerequisite; baseline migration strategy still needs to be established. |

## Positive controls already present

- RLS is enabled on the five base tables and on the guest token / RSVP history / seating tables added by the first migration.
- Customer profile creation uses a trigger and hard-codes the new role to `customer`; public metadata cannot assign admin.
- Guest invitation tokens are generated from 256 bits of randomness; only SHA-256 hashes are stored.
- Token issuance and RSVP write RPCs use `SECURITY DEFINER` with an empty `search_path`, and direct execution is restricted.
- Guest lookup and RSVP functions validate request method, origin allowlist, token shape, payload size, and expected values.
- Service-role credentials are read only in server-side Edge Function code, not in browser code.

## Still required before production

1. Execute the hardening migration on a disposable/test Supabase project after the base schema and earlier migrations are installed.
2. Test RLS using two separate customer accounts and anonymous access.
3. Verify the order column grants through PostgREST using a malicious insert that tries to set `amount_lkr`, `status`, and `admin_note`; it must fail.
4. Verify a customer cannot move a guest to an invitation they do not own.
5. Verify an event owner can read, approve, and delete guest-book submissions only for their own invitation.
6. Verify RSVP request 9 within the 15-minute window returns HTTP 429, and the window resets after expiry.
7. Review Storage bucket policies, file upload restrictions, admin role provisioning, Edge Function secrets, and production CORS origins.
8. Add broader abuse protection to guest lookup and public guest-book submission (for example platform-level rate limiting / CAPTCHA where appropriate).
9. Ensure migration history is reproducible on a fresh Supabase project.

## Deployment warning

The new migration is a proposed source change on the development branch. It has **not** been run against a database, and it must not be applied to production until staging tests pass. Do not place any Supabase service-role/secret key in GitHub, HTML, JavaScript bundles, or public project settings.
