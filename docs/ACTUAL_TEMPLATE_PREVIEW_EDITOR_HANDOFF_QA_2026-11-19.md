# Actual Invitation Template Preview & Editor Handoff QA — 2026-11-19

## Scope
Read-only source inspection of the active branch `ceo/project-completion-2026-11-18`. No production deployment, database change, or storage change was made.

## Actual invitation page verification
All 12 paths linked as catalogue previews exist and are full HTML documents. Each contains a doctype, title, viewport meta tag, body, and JavaScript:

1. `templates/blush-romance-wedding-template.html`
2. `templates/dreamy-fairytale-video-template.html`
3. `templates/five-hearts-date-reveal.html`
4. `templates/forever-story-wedding-template.html`
5. `templates/golden-floral-heart-reveal-template.html`
6. `templates/golden-heritage-video-template.html`
7. `templates/heritage-master-template.html`
8. `templates/poruwa-floral-story.html`
9. `templates/template-01-sandun-sajya.html`
10. `templates/template-02-rukshan-sithumi.html`
11. `templates/template-03-nimasha-akitha.html`
12. `templates/template-04-aravind-nihara.html`

## Live catalogue preview
The catalogue now injects each actual HTML page into its corresponding preview iframe. The old decorative mini invitation elements are removed at runtime. The preview iframe is lazy-loaded and has pointer events disabled so the outer preview link remains clickable.

Source-level verification only. No browser screenshot, runtime iframe, CSP/header, or cross-device visual test was performed. The iframe uses `sandbox="allow-scripts allow-same-origin"`; this combination needs a deliberate security review before production because same-origin scripts in a sandbox can weaken the isolation boundary.

## Editor handoff
11 of the 12 catalogue "Use this template" links pass a template ID that exists in the dashboard template registry. The first card, **Blush Romance**, links only to `dashboard-live.html` without a `createTemplate` parameter. It therefore does not preselect its corresponding template. This is a confirmed handoff defect.

There are also preview-to-editor identity mismatches that need correction before calling the library fully integrated:
- **Forever Story** preview opens `templates/forever-story-wedding-template.html`, but its Use action selects `ivory-baroque`, which routes to the separate `template-ivory-baroque.html` renderer. The workspace has a `forever-story` renderer ID, but the dashboard registry currently does not expose that ID.
- **Five Hearts Date Reveal** preview opens `templates/five-hearts-date-reveal.html`, while its Use action selects `golden-floral-reveal`, whose workspace renderer points to `template-golden-floral-reveal.html`.
- **Heritage Master** preview opens `templates/heritage-master-template.html`, while its Use action selects `golden-heritage`, which uses a dedicated workspace renderer.
- **Poruwa Floral Story** preview opens `templates/poruwa-floral-story.html`, while its Use action selects `sinhala-poruwa-story`, which uses the workspace's separate Poruwa renderer.

The remaining direct handoffs use matching IDs/pages for Dreamy Fairytale, Golden Floral Heart Reveal, Golden Heritage Video, and the four numbered reference templates. The dashboard has 11 selectable template IDs (plus Custom Studio). The workspace has its own template registry and separate render paths; not every standalone HTML page is automatically an editor-connected template. A successful catalogue preview must not be described as proof that customer edits, media upload, or publishing are connected to that standalone page.

## Next implementation tasks
1. Correct Blush Romance's editor handoff by adding a matching, supported template ID and renderer mapping, or clearly mark it as preview-only until that integration exists.
2. Audit the remaining 11 handoffs from dashboard selection through workspace preview and public invitation output.
3. Verify customer fields (names, date, venue, contact, agenda, images/video/music) reach the chosen actual invitation page.
4. Perform browser-based visual and interaction QA after the mappings are corrected.
5. Keep uploads labelled local until confirmed cloud storage upload is implemented and tested.

## Safety / release status
- Branch only: `ceo/project-completion-2026-11-18`
- No merge to main.
- No production deployment.
- No Supabase schema, Storage policy, or bucket configuration changes.
