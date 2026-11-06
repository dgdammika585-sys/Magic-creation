# MAGIC CREATIONS — Secure Guest Search & RSVP setup

This folder adds the server-side foundation for individual guest invitation links, private seating lookup and RSVP history. It is not live until the SQL migration and both Edge Functions have been deployed to your Supabase project.

## What this adds

- Each guest gets a random 256-bit personal token. The database stores only its SHA-256 hash.
- A public visitor cannot SELECT from the guests, token or RSVP-history tables.
- `guest-lookup` validates the token, checks that the invitation is published and returns only the invited guest's name, invited count, RSVP status and (when enabled and accepted) table name.
- `guest-rsvp` validates the token and writes Accept / Decline responses through a server-only database function.
- Repeated requests with the same request ID are idempotent.
- Table assignments are checked against the invitation's table capacity.

## Important: do not publish a secret key

The Supabase publishable key (or legacy anon key) may be used by a browser only when RLS is correctly configured. The Supabase secret / service-role key bypasses RLS and must remain in Supabase Edge Function secrets. Never put it in `index.html`, `dashboard.html`, `event-workspace.html`, or a GitHub repository.

## Setup order

1. In the Supabase SQL Editor, run `supabase-schema.sql` if this is a new project.
2. Then run `supabase/migrations/202611060001_guest_tokens_rsvp.sql`.
3. Deploy the functions in `supabase/functions/guest-lookup` and `supabase/functions/guest-rsvp` using the Supabase CLI or your Supabase deployment workflow.
4. Make sure the Edge Functions have the project environment variables `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` available. Supabase-hosted Edge Functions provide these by default. Older setups may provide `SUPABASE_SERVICE_ROLE_KEY`; the functions support that fallback too.
5. Keep the public website origin in the allowlist in `supabase/functions/_shared/common.ts`. Add a local development origin only when testing locally.
6. Create a published invitation and guest records in Supabase. To issue a guest link while signed in as the invitation owner, call:

```js
const { data, error } = await supabase.rpc('issue_guest_invitation_token', {
  p_guest_id: guestId
});
if (error) throw error;
// data.token is shown once. Add it to the personal invitation URL.
// Do not store or log it in analytics.
```

7. A guest page can call the lookup endpoint with `{ slug, token }`, then show only the returned guest details. For an RSVP, call the second endpoint with `{ token, response: 'attending' | 'not_attending', request_id: crypto.randomUUID() }`.
8. For an invitation to show a table name, the owner must enable `invitations.show_guest_table`, assign the guest using `assign_guest_table(guest_id, table_id)`, and the guest must have an `attending` RSVP.

## Endpoints

- `POST /functions/v1/guest-lookup` — request body: `{ "slug": "event-slug", "token": "64-character-token" }`
- `POST /functions/v1/guest-rsvp` — request body: `{ "token": "64-character-token", "response": "attending", "request_id": "UUID" }`

Send the project's publishable key in the `apikey` header when calling the endpoints. Do not send the secret key from the browser.

## Current website integration status

The GitHub Pages website is still a browser-local prototype. Its current event workspace stores events and guest data in localStorage. This migration does not automatically move those records into Supabase, add organizer login, or issue personal tokens from the existing guest list. Those are the next frontend integration tasks after the owner has created a Supabase project and run this setup.

Before using real customer data, verify two different organizer accounts cannot see one another's records; test expired/revoked guest links; test wrong-event tokens; test table over-capacity; and test duplicate RSVP request IDs. Do not launch public guest lookup until those tests pass.
