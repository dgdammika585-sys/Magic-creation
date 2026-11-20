# MAGIC CREATIONS — Public Invitation Link Sprint
**Date:** 20 November 2026  
**Branch:** `ceo/project-completion-2026-11-18`  
**Scope:** Secure cloud-backed public invitation link using a slug, e.g. `/i/harsha-chathu`.

## Completed

### Supabase
- Added `public.invitations.public_data` as a separate JSONB snapshot field.
- Added `public.mc_resolve_public_invitation(p_slug)`, returning only the public snapshot for a matching `published=true` row.
- Resolver is `SECURITY INVOKER` with an empty `search_path`; it does not bypass RLS.
- Granted anonymous SELECT only on `slug`, `published`, and `public_data`. The existing RLS policy limits anonymous reads to published rows.
- Verified `anon` cannot SELECT `workspace_data` or `owner_id`; it can SELECT `public_data`.
- Verified the resolver can be invoked as `anon` and returns null for an unknown slug.
- No anonymous table-wide SELECT was granted. No legacy RPC was reused.

### Public snapshot safety
- Cloud save now creates an allowlisted public snapshot, separate from private `workspace_data`.
- Snapshot omits host private phone, guest lists, guest-specific data, tables, budgets, expenses, owner IDs, seat assignments, and nested phone/email fields.
- Only approved guest-book wishes are included.
- Media links are restricted to HTTPS URLs.
- Publishing is an explicit cloud action. A local prototype `published=true` flag cannot accidentally publish a new cloud record during background hydration.
- Existing live records remain live on normal saves; explicit Unpublish clears the public snapshot and turns off the published flag.

### Website
- Added public slug resolver route to `event-workspace.html`.
- Anonymous users can open the public route without signing in.
- Added GitHub Pages `404.html` fallback for clean `/i/{slug}` paths.
- Workspace and dashboard publish controls now use explicit cloud publish/unpublish calls.
- Public page uses the same invitation renderer and loads the snapshot from Supabase rather than embedding event JSON in the URL.

## Verification and limitations
- Supabase SQL executed successfully.
- Column privilege checks: `anon_can_read_public_data=true`, `anon_can_read_private_workspace=false`, `anon_can_read_owner_id=false`.
- Resolver metadata check: `SECURITY INVOKER`, `search_path=''`.
- Anonymous resolver smoke test for an unknown slug returned `null`.
- Security Advisor after the change did not report the new resolver. Existing unrelated warnings remain for older SECURITY DEFINER RPCs and two RLS tables without policies; these were not changed in this scoped task.
- The project currently has no invitation rows, so a real published-record test could not be run.
- No browser visual or cross-device test was performed.
- Changes are on the working branch only. GitHub Pages production is not deployed from this branch, so a live public URL is not available yet.
- The SQL was applied directly using Supabase SQL execution; this report preserves the exact SQL. No formal Supabase CLI migration-history entry was generated.

## Next required test
After the branch is deployed and an authenticated customer saves an invitation, publish it from the workspace. Then test:
1. Public slug opens without login.
2. The correct full invitation template and media render on mobile.
3. Unpublish makes the same URL return “Invitation unavailable”.
4. Direct anonymous reads of private columns remain denied.
