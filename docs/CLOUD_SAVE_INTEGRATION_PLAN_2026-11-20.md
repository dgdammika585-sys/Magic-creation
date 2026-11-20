# MAGIC CREATIONS — Cloud Save Integration Plan
**Date:** 20 November 2026  
**Branch:** `ceo/project-completion-2026-11-18`  
**Status:** Implementation plan only — no source, database, storage, or production changes made in this step.

## Goal
Move customer invitation records from device-only storage to owner-scoped Supabase persistence while keeping existing customer work safe. Preserve the current local draft experience as a fallback and never silently discard local edits.

## Verified integration points
- Dashboard storage key: `magic_creations_workspace_v1`.
- Dashboard uses `readState()` / `saveState()`; local event IDs are generated strings such as `mc-...`.
- Event Workspace uses the same storage key and has `load()` / `save()`; it loads the selected event from the shared local state.
- Both pages currently have no import/call to `assets/js/mc-cloud-store.js`.
- The cloud repository already maps the editor record to `public.invitations`, stores the complete event object in `workspace_data`, and returns `_cloudId` for the database UUID.
- The live `public.invitations` table contains all columns expected by the cloud repository, including `workspace_data jsonb NOT NULL DEFAULT '{}'`. No additive schema migration is required for this integration.
- Existing RLS is owner-scoped for authenticated CRUD. Anonymous table SELECT privilege is currently false.

## Recommended implementation design

### A. Shared cloud-sync controller
Add one small module (e.g. `assets/js/mc-cloud-sync.js`) that imports the existing Supabase client and cloud repository. Responsibilities:
1. Confirm the signed-in user with `getSignedInCustomer()`.
2. Fetch that user's invitations with `listMyInvitations()`.
3. Merge remote rows with local events using stable identity:
   - Cloud UUID: `_cloudId` is authoritative when present.
   - Local draft ID: preserve the existing `id` value when linking a local record to a cloud row.
   - Never match or merge records by couple name alone.
4. Save one event with `saveMyInvitation()`; after success, replace the local event with the returned row while retaining its local event ID and cloud ID.
5. Expose sync state: `local-only`, `syncing`, `saved`, `offline/error`, and `conflict`.
6. Do not perform background destructive deletes. Deletion requires an explicit customer action and a confirmed cloud delete.

### B. Safe first-login migration
On the first signed-in load:
1. Read local events before requesting cloud data.
2. Fetch cloud events.
3. For each local event, match only by `_cloudId`; if no cloud ID exists, treat it as a local-only draft.
4. Offer/import local-only events to the signed-in account, saving each one and retaining its local ID.
5. If any save fails, keep the original local record untouched and show which event needs retry.
6. Do not replace local state with an empty cloud response.
7. Do not upload sample/demo records as customer content without clear identification and user choice.

### C. Dashboard integration
- Keep dashboard rendering synchronous from local state for fast display.
- Start cloud sync after authentication and local hydration.
- Create event: save locally first, then attempt cloud insert; if successful attach `_cloudId`.
- Edit/publish/unpublish: save locally first, then sync the changed event.
- Live/Draft status must reflect the actual cloud `published` field only after a successful save. A local-only draft must not be described as publicly live.
- Show a compact status label: Saved on this device / Saving to cloud / Saved to cloud / Cloud sync needs attention.
- If cloud sync fails, keep local changes and show a retry action.

### D. Event Workspace integration
- Continue loading the selected event from the shared local store.
- Save editor changes locally immediately, then debounce cloud persistence to avoid a request on every keystroke.
- On successful cloud save, merge returned `_cloudId` and server `updated_at` metadata into the existing local event without resetting active editor state.
- If another browser has changed the same event since the current copy was loaded, do not silently overwrite it. Show a conflict notice and offer reload or keep-my-copy as an explicit choice.
- Large inline image/video/audio data URLs are already rejected by the cloud repository. Until Storage upload is implemented, clearly tell the customer that the event remains device-local when it contains media above the supported inline limit.

### E. Public link / publishing boundary
This integration does **not** make public slug lookup work. Keep existing preview links clearly labelled as previews until a separate public resolver is implemented.
- Do not grant anonymous table SELECT.
- Do not expose `workspace_data` to the public.
- A future public endpoint must return an explicit allow-list of guest-facing fields for published invitations only.
- Guest-specific RSVP access must use high-entropy, revocable guest tokens, not embedded full event JSON or predictable IDs.

## Risks to resolve before coding
1. **Slug uniqueness:** verify the live unique constraint and define a collision flow before handling insert errors. Never silently mutate an existing customer's slug.
2. **Schema / code drift:** verify `mc-cloud-store.js` against the live table and current source before integrating; the file header still references an older integration note.
3. **Large media:** gallery data URLs can exceed the repository's inline media limit; Storage upload and bucket security remain a separate prerequisite for durable media sync.
4. **Merge policy:** avoid name-based matching and never overwrite newer cloud state without a conflict check.
5. **Publication truth:** the current UI's Live status is browser-local; it must not imply public availability until a real public URL resolver exists.

## Test plan (must pass before calling integration complete)
- Existing local-only events remain visible after login and after a failed cloud request.
- First cloud save creates one row and attaches `_cloudId`; subsequent saves update that same row, not duplicate it.
- User A cannot list, update, or delete User B's invitations.
- Dashboard create/edit/publish/unpublish state survives reload and another browser session.
- Workspace edits survive reload and preserve event selection.
- Slug collision is reported without overwriting another record.
- Large inline media triggers a clear device-local / upload-required warning and does not lose the local draft.
- Public preview remains a preview; no claim of canonical public publication until the separate slug resolver is built.
- Verify in a real browser with two accounts and two independent browser contexts; source inspection alone is not sufficient.

## Scope / approval
This plan is source-level architecture only. It does not authorize database changes, RLS changes, Storage policy changes, public RPC creation, production deployment, or merging to `main`. A source-only implementation on the working branch may proceed after this design review; public publishing and media cloud upload remain separately gated.
