# MAGIC CREATIONS — Customer Journey QA Report
Date: 2026-11-19
Branch: ceo/project-completion-2026-11-18
Scope: Static source review of login.html, dashboard.html, event-workspace.html and mc-cloud-store.js.
Status: Static implementation update completed on the development branch. No database migration, user creation, merge, or deployment performed.

## Executive result
The customer journey is visually present, but it is not yet safe or complete for real customer use. The current implementation is still a browser-local prototype. Authentication UI and a cloud repository helper exist, but they are not connected end-to-end.

## Findings (priority order)

### P0 — Dashboard and workspace authentication guard (implemented; browser QA pending)
- Added `assets/js/mc-auth-guard.js` and included it in `dashboard.html` and `event-workspace.html`.
- Dashboard and the private workspace now check for a Supabase session and a valid authenticated user before revealing the page; signed-out/invalid sessions are redirected to `login.html`.
- A Sign out control is added to protected pages; `SIGNED_OUT` auth events redirect to login.
- Public guest invitation links using the `#invite=` payload and full-template previews are deliberately excluded from the private workspace guard.
- This is a client-side navigation guard only; database RLS remains the actual data security boundary. Browser verification is still required.

### P0 — Customer invitation data is not cloud-backed
- dashboard.html uses localStorage key magic_creations_workspace_v1 for readState/saveState.
- event-workspace.html uses the same browser storage key for load/save.
- assets/js/mc-cloud-store.js exists but is not imported or called by either page.
- The helper expects public.invitations.workspace_data JSONB, which is not present in the audited database schema.
- Required: obtain explicit owner approval for the additive workspace_data migration; apply and verify it only after approval; then integrate list/create/update/delete with owner-scoped queries and visible sync/error states.
- Do not silently upload or merge existing local drafts. Provide an explicit, user-controlled import/migration step after cloud integration.

### P1 — Password recovery is incomplete
- login.html sends reset email with redirect to login.html?reset=1.
- On return, the page only displays a message telling the user to open the reset email link; it does not show a new-password form or call supabase.auth.updateUser({ password }).
- Required: implement a recovery session state, new password + confirmation fields, validation, updateUser call, success state, and safe redirect to dashboard.

### P1 — Authentication lifecycle and configuration need live verification
- Signup, email confirmation, sign-in, recovery and session redirect are only statically reviewed.
- Supabase Auth Site URL and Redirect URLs must include the actual deployed login.html and dashboard.html URLs.
- Required: test signup, confirmation, sign-in, sign-out, expired session, recovery and refresh/session restoration in a real browser before release.

### P1 — Local prototype language remains visible in customer workspace
- Event Workspace displays “Local prototype · not cloud synced” and its help card says data is saved only in this browser.
- Dashboard contains prototype/local-only notices and local “Live” publishing is not public hosting.
- Required: retain honest notices until cloud and public invitation publishing are genuinely connected; do not represent local preview status as a live public invitation.

### P2 — Navigation and product readiness
- Workspace currently marks Table Management and Guest Management as “SKIPPED”; Media Management is intentionally marked “SKIPPED”.
- The requested product navigation expects these as proper customer workspace modules, with Media Management retained as the agreed skipped item until its implementation phase.
- Required: confirm which modules are genuinely implemented and label incomplete modules clearly; complete Table Management and Guest Management before customer launch.

## Positive checks
- Login page uses Supabase email/password sign-in, signup and reset-email request.
- Signup captures full name, phone and preferred language metadata.
- Browser code imports the publishable Supabase client; no service-role key was found in the reviewed files.
- Dashboard and workspace escape user-provided text before inserting it into generated HTML in the reviewed helper paths.
- Cloud repository helper scopes reads/updates/deletes by the authenticated user's owner_id, with RLS expected as the final boundary.
- User-facing pages include responsive CSS and visible focus styling in reviewed areas.

## Release gate
Do not publish this as a production customer account system until P0/P1 items are fixed and browser-tested. Keep the development branch separate from main. No merge or deploy is authorized by this report.

## Next implementation sequence
1. Browser-test the new auth guard on dashboard, iframe workspace, direct workspace URL, public guest invitation link, and full-template preview.
2. Password recovery UI and update flow implemented; live email/browser test remains.
3. Confirm/verify Supabase redirect configuration and run browser auth tests.
4. Obtain explicit approval for workspace_data migration; only then migrate schema.
5. Integrate cloud invitation CRUD, sync status and explicit local-draft import.
6. Complete module QA and run regression tests on desktop/mobile.


## Password recovery implementation update (2026-11-19)
- `login.html` now handles Supabase `PASSWORD_RECOVERY` auth events and reset-link sessions.
- Added new-password and confirmation inputs; validates minimum length and matching values; updates the signed-in recovery session with `supabase.auth.updateUser({ password })`.
- Successful update redirects to the customer dashboard. Reset-email response remains non-enumerating.
- Static source verification only. Supabase redirect allowlist, actual email delivery, link expiry/reuse, password update and mobile browser behavior still require live testing.
