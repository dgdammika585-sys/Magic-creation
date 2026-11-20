# MAGIC CREATIONS — Cloud Save & Public Invitation Architecture Audit
**Date:** 20 November 2026  
**Branch:** `ceo/project-completion-2026-11-18`  
**Scope:** Read-only source and live Supabase inspection. No schema, policy, storage, source-code, or production changes were made.

## Executive summary
Cloud persistence is still not connected to the customer dashboard or event workspace. Both pages continue to use browser `localStorage`. The prepared cloud repository is structurally close to the current `public.invitations` table, and the live database now contains the `workspace_data` JSONB column that the repository requires.

## Verified findings

### 1. Live database schema
- `public.invitations` has RLS enabled.
- It contains `workspace_data jsonb NOT NULL DEFAULT '{}'`.
- The column comment describes it as private customer-owned editor/workspace state and says not to expose it to anonymous public invitation queries.
- The `invitations` table has owner-scoped authenticated SELECT/INSERT/UPDATE/DELETE policies.
- The public SELECT policy is conditioned on `published = true`, but the live privilege check returned `anon_can_select_invitations = false`. Therefore the anonymous role currently has no table-level SELECT privilege; the policy alone does not grant access.
- Authenticated users have table SELECT privilege, with RLS restricting rows to their owner (or admin).

### 2. Cloud repository readiness
File: `assets/js/mc-cloud-store.js`
- Uses `supabase.auth.getUser()` to require a signed-in user.
- Lists, inserts, updates, and deletes invitations with owner filters.
- Maps event fields to the existing invitation columns and stores the full editor state in `workspace_data`.
- Uses the browser publishable key only; no service-role key is present.
- Rejects large inline image/video/audio data URLs rather than storing large media inside JSON.
- The repository is not yet imported by `dashboard.html` or `event-workspace.html`.

### 3. Customer journey remains browser-local
Source checks on the active branch:
- `dashboard.html`: no cloud-store import or cloud repository calls; reads/writes `magic_creations_workspace_v1` in localStorage.
- `event-workspace.html`: no cloud-store import or cloud repository calls; reads/writes the same localStorage key.
- Public invitation rendering still supports `#invite=` Base64 snapshot links.
- The public link is therefore not yet a canonical short-slug lookup backed by the `invitations` table.

### 4. Public data boundary
- Do not expose `workspace_data` through anonymous table reads or a public `SELECT *` query.
- The existing anonymous table privilege check is currently false, which is a useful guardrail. If anonymous table access is ever granted later, use a narrowly scoped public RPC or safe view that returns only the explicitly approved public invitation fields.
- The legacy `mc_get_public_invitation` and `mc_submit_rsvp` functions are SECURITY DEFINER and executable by anon. Their inspected definitions operate on the separate legacy `mc_events` / `mc_guests` tables, check published status and guest code, and should be reviewed separately before any new public-link flow is built. Do not broaden their grants or reuse them for the new `invitations` table without a security review.

## Recommended implementation sequence
1. **Cloud sync integration (source change only):** connect dashboard and workspace to `mc-cloud-store.js`; preserve local drafts as a fallback; show clear Saved locally / Syncing / Saved to cloud / Sync failed states.
2. **Conflict and recovery design:** retain local draft until cloud save is confirmed; use `updated_at` and explicit conflict handling rather than silently overwriting newer edits.
3. **Canonical public slug endpoint:** resolve only published invitations by slug through a safe RPC/view that returns a strict public projection; never return `workspace_data`, guest phone numbers, owner IDs, private notes, or admin-only fields.
4. **Public short links:** make the slug the canonical public URL; keep guest-specific RSVP access behind high-entropy, revocable tokens rather than embedding full event JSON in the URL.
5. **Storage readiness:** before enabling customer uploads, set file-size and MIME restrictions and define owner-scoped upload/read policies for the invitation media bucket.
6. **QA:** test signup/login, cloud create/edit/reload on another browser, publish/unpublish, public slug access, unauthorized slug access, guest RSVP token flows, media upload limits, and local fallback.

## Approval boundary
This audit was read-only. No migration is proposed as a prerequisite for the current cloud repository because the live database inspection already found `workspace_data`. Before wiring the customer journey, the next change should be a source-only implementation plan plus a precise review of public-read and storage boundaries. No database or production changes should be made without explicit approval.

## Verification limits
This was a source and live-schema inspection only. No browser end-to-end tests, real customer signup, media upload, or production deployment test was performed.
