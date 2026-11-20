# MAGIC CREATIONS — Customer Journey Source Audit
Date: 2026-11-20
Branch: `ceo/project-completion-2026-11-18`
Repository: `dgdammika585-sys/Magic-creation`

## Scope
Source-level inspection of the customer journey: login/signup → dashboard → template selection → invitation details → workspace save → public invitation link. No live browser interaction, Supabase writes, database changes, Storage changes, merge, or deployment were performed.

## Verified from source
1. `login.html` uses Supabase Auth `signUp`, `signInWithPassword`, `resetPasswordForEmail`, and `updateUser`. Successful sign-in and signup with an active session redirect to `dashboard.html`.
2. `dashboard.html` loads `assets/js/mc-auth-guard.js`; `event-workspace.html` also loads the guard except for public full-template previews and `#invite=` public links.
3. Dashboard and workspace use the same localStorage key: `magic_creations_workspace_v1`. Dashboard creates invitation records locally and opens `event-workspace.html` in an iframe, preserving the selected event through this browser storage.
4. Template selection writes the selected template ID to the local event record. Workspace template registry and public renderer contain template-specific routing.
5. Workspace editor save writes the event object to localStorage. The UI explicitly reports that drafts are saved “on this device”.
6. Public link generation serializes invitation data into JSON, UTF-8 encodes it, Base64 encodes it, and places it in the URL fragment as `#invite=`. The slug is also added as a query parameter, but the inspected public-link generator does not fetch a public invitation record by slug.
7. Dashboard's Live/Draft toggle sets a local `published` flag and generates a sample link in the browser. It does not publish a row to Supabase.
8. `assets/js/mc-cloud-store.js` contains owner-scoped Supabase CRUD for `public.invitations`, but the inspected dashboard/workspace journey does not import or call it. Its own header documents the required `workspace_data` JSONB column, which has not been approved/applied.

## Gaps / risks
- **No cloud persistence in the customer journey:** account authentication is cloud-based, but invitation records remain browser-local. A customer signing in on another browser/device will not automatically see drafts created elsewhere.
- **Slug is not yet a true public lookup route:** the generated public URL still depends on the encoded fragment payload. The slug is descriptive metadata, not a database-backed short link.
- **Link size and maintenance:** the fragment can become very long because event details and selected media are embedded in it. Regenerating the link after editing is important; previously shared links retain their earlier embedded snapshot.
- **Base64 is not encryption:** anyone who receives the link can decode the URL payload. Do not place private notes, confidential guest details, or sensitive information in the public invitation payload.
- **Live status is local-only:** the current dashboard label should not be represented as a globally published, cloud-hosted invitation.
- **Browser testing still required:** email confirmation, password recovery, iframe navigation, actual template rendering with customer data, mobile behavior, and guest-facing links have not been exercised in a real browser during this audit.

## Recommended next implementation sequence
1. Agree the cloud persistence schema and explicitly approve the additive `workspace_data` migration before applying it.
2. Wire the dashboard/workspace to the owner-scoped cloud repository with a safe local-draft fallback and clear sync status.
3. Implement a public invitation lookup by unique slug (published records only), with server-side/RLS-safe read access and no private workspace fields exposed.
4. Replace Base64 event snapshots with short canonical public URLs; retain only the minimum guest-specific token data in secure, scoped links.
5. Add end-to-end browser QA for signup, email confirmation, sign-in, create/select template, edit/save, publish, open public URL in a private browser/device, and RSVP.

## Change / safety record
This audit changed no application code, database schema, Storage policy, secrets, production settings, or deployment state.
