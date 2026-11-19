# Live Supabase audit — 2026-11-19

## Scope and safety

Read-only inspection of the connected MAGIC CREATIONS Supabase project. No schema, policy, storage, function, or production data changes were made during this audit.

## Current state

- Project status: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.11.
- Public tables inspected: 11; all reported with RLS enabled.
- Table row counts: 0 in the inspected tables at audit time.
- Applied migration history:
  - `baseline_magic_creations_schema`
  - `guest_tokens_rsvp`
  - `auth_profile_trigger`
  - `security_hardening`
  - `function_access_rls_tuning`
- Supabase Edge Functions: none currently listed as deployed.
- Storage bucket: `mc-invitation-media`; public bucket, no file-size limit configured, no allowed-MIME allowlist configured.

## Controls confirmed

- Customer order INSERT is restricted at column level: authenticated users cannot insert `status`, `amount_lkr`, `admin_note`, `order_number`, IDs, or timestamps. RLS also checks customer ownership and invitation ownership.
- Guest UPDATE policy checks that the destination invitation belongs to the same authenticated owner (or admin).
- Guestbook owner SELECT/UPDATE/DELETE policies are present; public INSERT requires an unpublished/approved=false entry, bounded guest name/message, and a published invitation.
- Guest invitation token and RSVP rate-limit tables have RLS enabled and no direct policies; access is intended through restricted server-side functions.
- The newer token-based `submit_guest_rsvp` RPC is executable only by `service_role`.
- Invitation media object INSERT/UPDATE/DELETE policies constrain paths to the authenticated user's folder.

## Findings requiring follow-up

### Security

1. Supabase security advisor reports two anonymous-executable SECURITY DEFINER RPCs:
   - `mc_get_public_invitation(p_slug, p_guest_code)`
   - `mc_submit_rsvp(p_slug, p_guest_code, p_status, p_guest_count, p_note)`

   Both operate on the legacy `mc_events` / `mc_guests` data model. Their definitions use `search_path = public`, unlike the safer empty search path used by newer functions. Review whether the legacy model is still used. If not, revoke public execution or retire these RPCs after confirming no frontend dependency. If still used, harden their search path, validate inputs and add throttling before keeping them public.

2. Security advisor reports authenticated-executable SECURITY DEFINER functions:
   - `assign_guest_table`
   - `is_magic_creations_admin`
   - `issue_guest_invitation_token`
   - and the two `mc_*` RPCs above.

   The first three inspected definitions validate the current user/ownership and use an empty search path. Their advisor warnings are not proof of an exploit; retain only the minimum required grants and add integration tests.

3. `mc-invitation-media` is public and has no file-size or MIME allowlist. Decide whether public read is intentional for published invitation media. Configure a reasonable size cap and allow only required image/video/audio MIME types; ensure private guest uploads use a separate private bucket and approval flow.

4. Security advisor flags RLS-enabled/no-policy on `guest_invitation_tokens` and `guest_rsvp_rate_limits`. This is intentional defense-in-depth if all access is via service-role functions. Keep it that way; do not add client-facing policies.

### Performance

- Advisor reports six foreign keys without covering indexes: token→invitation, guests→owner, guests→table, orders→invitation, seating tables→invitation, seating tables→owner. Add indexes after checking existing index definitions and expected query patterns.
- Several indexes are marked unused. The project is new/has no data; do not drop them based on this early signal.

## Next safe steps

1. Review frontend references to `mc_get_public_invitation` and `mc_submit_rsvp` before changing legacy RPC grants.
2. Confirm storage usage and intended public/private media access; then propose a bucket restriction migration.
3. Add the missing foreign-key indexes in a separate migration after checking duplicates and naming.
4. Deploy and test the repository's Edge Functions; none were listed as deployed at audit time.
5. Run two-account authorization tests for orders, guest reassignment, guestbook moderation, seating capacity and RSVP throttling.
6. Keep all proposed changes in a development branch and do not merge until tests pass.

## Important note

This report records observed live state at the audit timestamp. It does not certify that all application paths are production-ready.
