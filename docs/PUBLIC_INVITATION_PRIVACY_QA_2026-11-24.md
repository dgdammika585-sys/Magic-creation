# MAGIC CREATIONS — Public Invitation Privacy QA
**Date:** 24 November 2026  
**Branch:** `ceo/project-completion-2026-11-18`  
**Scope:** Public invitation snapshot source review; no database or production changes.

## Finding and fix
The public snapshot allowlist included `contactEmail` and the three contact-person name/phone pairs regardless of whether the customer had disabled the Contact Details section. The public renderer hides that section when disabled, but the resolver still returns the snapshot fields to anonymous visitors. This was an unnecessary disclosure of contact details.

Updated `assets/js/mc-cloud-store.js` so these contact fields are omitted from the public snapshot when `sections.contactDetails === false`. When the section is enabled, or the section setting is absent (the renderer's default-enabled behavior), the fields remain eligible for the public invitation.

## Static source checks
- [x] Contact email and contact-person fields are checked before copying to public data.
- [x] Disabled Contact Details section skips those fields.
- [x] Enabled or unspecified Contact Details section preserves the existing allowlist behavior.
- [x] Private `workspace_data` remains separate from `public_data`.
- [x] No database migration, bucket, secret, function deployment, merge, or production deployment was performed.

## Required staging/browser regression tests
1. Create an invitation with Contact Details enabled and add contact name, phone, and email; publish in staging; verify the public page shows the contacts and the resolver returns the intended fields.
2. Disable Contact Details and publish again; verify the public page hides contacts and the anonymous resolver response contains none of `contactEmail`, `contactPerson1Name`, `contactPerson1Phone`, `contactPerson2Name`, `contactPerson2Phone`, `contactPerson3Name`, or `contactPerson3Phone`.
3. Verify RSVP behavior still works when Contact Details is disabled; if it requires a public contact number, implement a separately consented RSVP contact field rather than leaking the hidden Contact Details values.
4. Re-enable Contact Details and verify the fields return only after an explicit save/publish.
5. Verify an unrelated guest/account cannot read private workspace data.

## Limitations
This is a source-level privacy fix and QA checklist only. It has not been tested against a live Supabase staging project or in a browser. Existing public invitation data already stored in Supabase is not rewritten by this client-side change; republish affected invitations after staging verification. Do not treat this as production verified.
