# Template-to-Editor Integration QA — 2026-11-19

## Changes completed
- Added dedicated dashboard and workspace template IDs for `blush-romance`, `heritage-master`, and `poruwa-floral-story`.
- Connected those IDs to their matching full-page HTML invitation renderers:
  - `templates/blush-romance-wedding-template.html`
  - `templates/heritage-master-template.html`
  - `templates/poruwa-floral-story.html`
- Added bride/groom query aliases for the Heritage Master page while preserving the shared customer-data query parameters.
- Updated the catalogue's Use actions so all 12 catalogue entries select their corresponding template IDs.
- Changed catalogue preview iframe sandbox from `allow-scripts allow-same-origin` to `allow-scripts` to keep scripts available while isolating the preview origin.

## Static QA results
- 12/12 catalogue Use links resolve to a registered dashboard template ID.
- 12/12 catalogue Use IDs are present in the workspace template registry.
- 12/12 IDs are covered by the public invitation rendering path (direct reference renderer or existing dedicated renderer).
- No duplicate dashboard template IDs found among the 12 catalogue designs.
- No missing Use-link IDs found.

## Not yet verified
- No real browser click-through or visual comparison was run in this task.
- No mobile device/browser rendering test was run.
- Dynamic customer data rendering is source-mapped, not end-to-end tested with a saved event.
- Iframe sandbox behaviour is source-reviewed only; browser compatibility still needs testing.
- Customer media upload, Supabase Storage, RSVP, guest photo uploads, and guest-book persistence are not validated by this integration QA.

## Safety and deployment
- Changes are committed only to `ceo/project-completion-2026-11-18`.
- No production deployment or merge was performed.
- No Supabase schema, Storage bucket, or Storage policy was changed.

## Follow-up data handoff refinement
- Updated the shared template URL builder to prefer the couple's bride/groom names when the explicit `names` field is empty, using the invitation title only as a last fallback. This prevents a generic invitation title from replacing the couple's names in templates that consume the `names` parameter.
- Source re-read confirms the updated fallback is present. This remains source-level verification, not a browser end-to-end test.
