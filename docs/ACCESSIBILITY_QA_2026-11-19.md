# Invitation Template Accessibility QA — 2026-11-19

Branch: `ceo/project-completion-2026-11-18`

## Scope
Source-level accessibility and responsive-readiness checks for the two separately maintained reference templates:
- `templates/template-04-aravind-nihara.html` — Sunset Romance
- `templates/template-01-sandun-sajya.html` — Poruwa Floral

## Changes made
### Aravind & Nihara
- Added a keyboard-visible skip link targeting the invitation's main content.
- Added visible `:focus-visible` outlines for links, buttons, inputs, selects and textareas.
- Added descriptive alternative text to the four static gallery placeholder images.
- Preserved existing reduced-motion handling and visual design.

Commit: `8be452218a7cc9a42d7cd6a94cdd688ca751be6d`

### Sandun & Sajya
- Added a keyboard-visible skip link targeting the invitation's main content.
- Added skip-link focus styling while preserving the existing focus-visible and reduced-motion rules.
- Preserved existing Poruwa invitation reveal and page layout.

Commit: `18699c9c0a27b046ea7074eee448f9b99d5d8a3a`

## Post-change source checks
| Check | Aravind & Nihara | Sandun & Sajya |
|---|---:|---:|
| Viewport meta | PASS | PASS |
| HTML language | PASS | PASS |
| Reduced-motion CSS | PASS | PASS |
| Visible focus styling | PASS | PASS |
| Keyboard skip link + target | PASS | PASS |
| Static image alt text | PASS | PASS |
| Safe rel on target=_blank links | PASS | PASS |
| Main sections | 13 | 16 |

## Limitations
- Chromium is installed in the available container, but external DNS/network access is unavailable, so the current branch files could not be fetched into the local browser for rendered screenshot testing.
- No actual viewport screenshots, mobile-device tests, screen-reader tests, calendar-import tests, RSVP submission tests, upload tests, guest lookup tests or Supabase integration tests were performed.
- This is source-level QA, not visual sign-off or production approval.
- No PR merge or production deployment was performed.

## Next QA gates
1. Render both templates at 360px, 390px, 430px and desktop widths once a browser session can load the branch files.
2. Compare each rendered page against its own supplied reference video; do not combine the two styles.
3. Test keyboard-only navigation and screen-reader labels.
4. Exercise calendar, RSVP, guest lookup, photo upload and music controls against their intended backend.
5. Obtain explicit approval before merging or deploying.
