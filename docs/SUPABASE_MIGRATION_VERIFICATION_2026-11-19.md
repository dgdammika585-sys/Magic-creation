# MAGIC CREATIONS — Supabase Migration Verification
Date: 19 November 2026
Project: yidsydqmiodolhgftypv
Migration: 20261119065409 / add_private_invitation_workspace_data
Branch: ceo/project-completion-2026-11-18

## Authorization
The project owner explicitly approved adding the private invitation workspace JSONB column in chat on 19 November 2026.

## Applied change
```sql
alter table public.invitations
  add column if not exists workspace_data jsonb not null default '{}'::jsonb;

comment on column public.invitations.workspace_data is
  'Private customer-owned event workspace configuration and editor state. Do not expose to anonymous public invitation queries.';

revoke select on table public.invitations from anon;
```

## Why the anonymous SELECT privilege was revoked
Before migration, the `anon` role had table-level SELECT on `public.invitations`, and an RLS policy allowed anonymous SELECT of published invitation rows. Adding private editor state to that same row would have made the workspace JSON visible to anonymous clients. PostgreSQL table-level SELECT grants cannot be safely counteracted by a column-level revoke, so anonymous table SELECT was removed. Existing authenticated owner/admin SELECT policies remain unchanged. The current front end was statically checked and does not directly query `public.invitations` for public rendering. A future public invitation page must use a deliberately limited public payload/RPC or safe-column access design.

## Verification results
- `workspace_data` exists on `public.invitations`.
- Type: `jsonb`.
- Nullable: NO.
- Default: `'{}'::jsonb`.
- Migration history includes `20261119065409 add_private_invitation_workspace_data`.
- `anon` no longer has table-level SELECT on `public.invitations`.
- Existing authenticated owner-scoped SELECT/INSERT/UPDATE/DELETE RLS policies remain present.
- Invitations table row count before migration: 0.
- No invitation rows were inserted, updated, or deleted by this migration.
- No localStorage drafts were uploaded.
- Security and performance advisors were rerun.

## Remaining advisor findings (not changed in this migration)
Security:
- Two anonymous-executable SECURITY DEFINER RPCs: `mc_get_public_invitation`, `mc_submit_rsvp`.
- Three authenticated-executable SECURITY DEFINER RPCs: `assign_guest_table`, `is_magic_creations_admin`, `issue_guest_invitation_token`.
- RLS-enabled tables without policies: `guest_invitation_tokens`, `guest_rsvp_rate_limits` (may be intentional deny-all; review required).

Performance:
- Six foreign keys lack covering indexes.
- Unused-index notices remain; no indexes were dropped because the database is new/empty.

## Not done
- Cloud CRUD integration is not wired into dashboard/workspace.
- Auth guards and password recovery remain incomplete.
- No signup or customer accounts were created.
- No public deployment, PR merge, or production release was performed.
