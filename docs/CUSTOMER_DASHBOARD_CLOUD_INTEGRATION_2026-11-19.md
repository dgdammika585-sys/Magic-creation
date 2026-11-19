# Customer Dashboard Cloud Integration — 19 November 2026

## Current verified state

- The dashboard and event workspace both use browser localStorage, not Supabase.
- Dashboard storage key: `magic_creations_workspace_v1`.
- The event workspace has a separate localStorage key (defined near the start of its script); both pages currently expect the browser-local event state.
- The Supabase `invitations` table already has owner_id, slug, event metadata, published state, and RLS policies for owner-scoped SELECT/INSERT/UPDATE/DELETE.
- The live policies require `owner_id = auth.uid()` for customer-owned rows. Public users can SELECT only published invitations.
- The current table does not have a JSON workspace payload column. The event workspace contains many nested settings (sections, agenda, guests, tables, gallery, budget, layout versions, animation and music settings) that cannot be represented by the current flat columns alone.
- `orders` and `profiles` have customer ownership policies. No database rows were created or changed during this integration preparation.

## Files added

- `assets/js/mc-cloud-store.js`: owner-scoped repository functions using the existing publishable-key Supabase client. It uses `auth.getUser()`, always filters by owner_id, and leaves RLS enabled as the security boundary.
- The repository maps the existing event object to the flat invitation columns and a future `workspace_data` JSONB column.
- Large embedded data-URL media is rejected rather than silently truncated or stored in a database row. Media must move to the Storage bucket first.

## Required additive database migration (not applied)

Before this repository can be used, add a nullable-safe JSONB column with a default:

```sql
alter table public.invitations
  add column if not exists workspace_data jsonb not null default '{}'::jsonb;
```

This is intentionally documented only. It has NOT been executed against the live Supabase database and is NOT yet a committed migration file.

## Integration plan

1. Apply and verify the additive migration in a controlled development step.
2. Add a shared authenticated session guard to dashboard and event-workspace pages; redirect unauthenticated visitors to login.
3. Replace dashboard localStorage reads with an owner-scoped cloud load, while preserving an explicit local-draft migration prompt (never auto-upload old browser data).
4. Update event-workspace save operations to persist the active event through `saveMyInvitation`; debounce frequent editor changes and surface save/error status.
5. Move gallery, cover, welcome video, audio, and other binary media into the private Storage bucket with owner-folder policies and strict MIME/size limits. Do not place large data URLs in JSONB.
6. Add two-customer RLS tests proving one customer cannot read, update, or delete another customer's invitation.
7. Browser-test signup, email confirmation, login, refresh/session restore, logout, create, edit, delete, and media upload before merging or deployment.

## Known limitations

- This repository module is a foundation, not a completed dashboard integration.
- It has not been wired into the dashboard or event workspace yet.
- Browser execution and authenticated end-to-end tests have not been run.
- Existing browser-local drafts are not automatically migrated or deleted.
- The open draft PR remains unmerged; production deployment has not been performed.
