# MAGIC CREATIONS — Customer Journey Source Audit
Date: 2026-11-20
Branch: `ceo/project-completion-2026-11-18`
Repository: `dgdammika585-sys/Magic-creation`

## Scope and verification level
Static source inspection of homepage, login/signup/password recovery, dashboard, workspace, template library, cloud repository/sync modules, media upload module, public invitation resolver, and route fallback. GitHub file contents were re-fetched after changes. This is not a real-browser, mobile-device, security-penetration, or production deployment test.

## Current source findings

### 1. Homepage and navigation
- Homepage points customers to the authenticated dashboard and full template library.
- The old miniature homepage template gallery has been replaced with an entry point to the full library.
- The homepage uses local browser state for its language selection; this is expected presentation state.
- Static source check only; visual layout, external links and mobile interactions still require browser QA.

### 2. Template library
- The library contains 12 actual invitation HTML page links, not just decorative template-card mockups.
- The 12 linked template files were fetched from this branch and all 12 exist.
- Each card loads its actual invitation HTML file into a large iframe preview. The iframe is not sandboxed so first-party template functionality and browser storage can work.
- Static checks confirm the large preview CSS, actual file paths, and all 12 files. Rendering, scroll behavior, keyboard navigation, performance and small-screen layout have not been browser-tested.

### 3. Customer authentication
- `login.html` contains both sign-in and account-creation tabs; a separate `register.html` page is not required by this implementation.
- Source calls Supabase `signUp`, `signInWithPassword`, `resetPasswordForEmail`, listens for `PASSWORD_RECOVERY`, and calls `updateUser({ password })`.
- Dashboard and private event workspace load the client-side authentication guard. Public invitation and full-template preview routes are deliberately exempt.
- This guard is only a UI/navigation layer. Database RLS must remain the real access boundary.
- Email confirmation, redirects, expired sessions, sign-out and password recovery have not been exercised in a real browser.

### 4. Dashboard and workspace persistence
- Dashboard and workspace use the same localStorage key: `magic_creations_workspace_v1`.
- Both now dynamically load `assets/js/mc-cloud-sync.js`; that module calls the owner-scoped repository in `mc-cloud-store.js` for list/create/update/delete and publish/unpublish workflows.
- Cloud sync uses the authenticated user's ID, owner filters and database RLS. The repository writes private workspace snapshots to `workspace_data` and a separate allow-listed `public_data` snapshot for published invitations.
- This is now source-wired; it is not merely an unused helper. However, no real customer account journey, cross-device save/reload, concurrent edit, or second-account isolation test has been run.
- Automatic import of pre-existing local drafts requires care. An account-switch privacy issue was found and the sync module was changed to maintain an owner marker and account-specific local snapshots. Unassigned legacy drafts are preserved separately and are not automatically uploaded to the first account that signs in. No manual legacy-draft import UI exists yet.

### 5. Public invitation links
- Workspace source publishes through the cloud sync module; the repository sets `published=true` only for an explicit Publish action and keeps private `workspace_data` separate from public allow-listed `public_data`.
- Public route `/i/{slug}` is handled through `404.html`, which redirects to the workspace public resolver. The resolver calls `mc_resolve_public_invitation` and requires `publicVersion === 1`.
- A relative-base issue on error/fallback paths was corrected by establishing the project-root base before resolving the public invitation.
- No real published invitation row was opened anonymously in a browser during this audit. Public RPC grants, data shape, unpublish behavior and shared-link refresh still need live acceptance tests.

### 6. Invitation media
- `mc-media-storage.js` uploads owner-selected image, MP4 and audio files to `mc-invitation-media` after client-side MIME and size checks.
- The bucket is public. Anyone with an object URL can retrieve an uploaded asset. Do not store private guest uploads here.
- Browser-side checks are not a substitute for server-side bucket limits and MIME restrictions. Upload, playback, replacement, deletion and cross-account denial remain untested.

### 7. Private Guest Gallery
- `mc-guest-gallery.js` is owner moderation source preparation only. It lists submissions, creates five-minute signed previews and records approval/rejection.
- Private bucket, storage policies, guest upload Edge Function, QR flow, mobile verification, owner UI wiring and approved-only public rendering remain outstanding.
- The proposal migration is not confirmed applied to production. Do not treat Guest Gallery as complete.

## Defect fixed during this audit
**Cross-account local draft exposure risk:** the old shared localStorage key could contain Customer A's drafts. If Customer A signed out and Customer B signed in on the same browser, automatic hydration could have imported A's local drafts into B's cloud account.

Fix committed in `assets/js/mc-cloud-sync.js`:
- Track the currently bound customer ID.
- Keep account-specific local snapshots.
- Preserve unassigned legacy drafts separately rather than auto-uploading them.
- Block cloud sync, publish and unpublish unless the active hydrated owner matches the current authenticated user.

Source assertions for these controls passed after refetch. This fix still requires a real two-account browser test.

## Release blockers
1. Cloudflare Workers Build preview for the latest branch commit is still reported as failed. The authenticated Cloudflare build log is not accessible through this audit session, so the exact failure cause is not yet established.
2. No verified deployment of this branch to GitHub Pages or Cloudflare.
3. No browser/mobile acceptance tests for auth, account isolation, cloud persistence, publish/open/unpublish, media or guest flows.
4. Storage public bucket limits and MIME allowlist are not configured.
5. Private Guest Gallery backend and UI workflow are incomplete.
6. Guest Book moderation, RSVP dashboard synchronization, complete Guest/ Table Management workflows, orders/payments and protected admin operations need further integration and testing.

## Verification summary
- Source re-fetch checks: PASS for the reviewed key files.
- Template file existence: PASS (12/12).
- Public route source path: PASS at static inspection level.
- Account-local-storage isolation controls: PASS at source assertion level.
- Real browser tests: NOT RUN.
- Mobile tests: NOT RUN.
- Supabase live writes during this audit: NOT RUN.
- Production migration/storage changes: NOT performed.
- Merge/deployment: NOT performed.

## Next test sequence
1. Test Customer A sign-up/login, create draft, save, logout.
2. Test Customer B login in the same browser; verify A's draft is absent and not inserted into B's database rows.
3. Login again as A; verify A's draft is restored.
4. Test cross-device reload, template selection, save, publish, anonymous open, unpublish.
5. Test upload/playback and cross-account denial.
6. Diagnose Cloudflare build logs and verify hosting source before any release.


## Follow-up cloud concurrency and account-switch audit (21 November 2026)

A further source review found two additional hazards in the local-first sync queue:
- A stale invitation editor could overwrite a newer cloud revision because updates did not compare the revision read before writing.
- A queued snapshot from one customer could remain pending while the browser switched to another customer account.

Source changes committed on the development branch:
- `assets/js/mc-cloud-store.js` now reads the row's `updated_at` revision and applies it as a conditional update predicate when an expected revision is supplied. If the row has changed, the write returns an error rather than silently overwriting the newer revision.
- `assets/js/mc-cloud-sync.js` supplies the expected cloud revision for existing invitation saves, hydration updates, publish and unpublish actions; it rechecks the active owner during sync; and it discards pending debounce snapshots when the active owner changes.
- Both ID-based and slug-based existing-row lookups retrieve `updated_at`.

Static source assertions passed for both lookup paths, revision comparison, conditional update, owner rechecks, revision propagation, and queue clearing. These are source-level checks only. They do not prove the behavior against live Supabase or multiple browser sessions.

Still required: two-account browser test, two-tab/device concurrent-edit test (verify stale save is rejected), publish/unpublish tests, and end-to-end public link test. Do not mark cloud save as production-verified until those tests pass.
