# MAGIC CREATIONS — Website Design Review & Next Sprint
**Date:** 19 November 2026  
**Branch:** `ceo/project-completion-2026-11-18`  
**Status:** Planning/review artifact only. No production deployment, database migration, or merge performed.

## 1. CEO review: current website foundation

The current `index.html` contains a real branded homepage rather than a blank starter page. The inspected source includes:
- MAGIC CREATIONS brand header, navigation, language control and customer-login entry point.
- A warm ivory / cream / rose visual direction with Playfair Display and DM Sans, plus Noto Sans Sinhala in the font stack.
- A hero area with invitation preview artwork and primary calls to action.
- Trust/benefit strip and a template gallery with category filters and multiple visual theme treatments.
- Additional feature and call-to-action sections further down the page.

This is a promising visual foundation. The next task is not to replace it blindly; it is to complete and verify the user journeys, make every visible control work, and ensure the experience remains excellent on mobile and in Sinhala.

## 2. Design system to standardise

| Token | Direction |
|---|---|
| Primary background | Paper / ivory: `#fffdf9` |
| Secondary background | Warm cream: `#f7f1eb` |
| Main text | Deep charcoal: `#282523` |
| Muted text | Warm grey: `#786f68` |
| Accent | Dusty rose: `#ad7475` |
| Accent light | Rose beige: `#ead2ca` |
| Supporting accent | Sage: `#87917e` |
| Display type | Playfair Display |
| Body type | DM Sans with Noto Sans Sinhala fallback |

Rules:
1. Use the same spacing, button, border, card and heading patterns across homepage, login, dashboard and event workspace.
2. Keep contrast readable; decorative pale text must not carry essential information.
3. Sinhala content must be tested with real Sinhala strings, not only English placeholder text.
4. Do not rely on hover alone. Every template preview and action must be usable by touch and keyboard.
5. Avoid adding decorative motion that makes the page slow or distracts from creating an invitation.

## 3. Required customer journey

1. **Discover:** visitor understands that MAGIC CREATIONS creates digital invitations in Sri Lanka.
2. **Explore:** visitor can browse invitation categories and preview templates.
3. **Choose:** visitor selects a template or chooses a custom invitation.
4. **Register / sign in:** customer can create an account, sign in, and recover a password.
5. **Create:** customer enters event details and edits the invitation.
6. **Manage:** customer manages guests, RSVP, table assignments, gallery, guest book and budget.
7. **Publish / share:** customer publishes and shares a clean invitation link.
8. **Track:** customer sees invitation status, guest responses and order progress.

Every step must have a clear next action, useful validation and a recoverable error state.

## 4. Next sprint — priority order

### P0 — Safety and reliability
- Keep the existing security-hardening pull request separate until its review and tests pass.
- Add an authentication guard to customer-only dashboard and workspace pages.
- Verify that signed-out visitors are redirected to login and returned safely after login.
- Confirm that a customer can only read and edit their own invitations.
- Never place Supabase service-role credentials in browser code.

### P1 — Homepage and navigation QA
- Check every navigation link, CTA, language control, template filter and preview action.
- Verify the mobile menu, keyboard focus, visible focus states and touch target sizes.
- Test at narrow mobile, standard mobile, tablet and desktop widths.
- Test English and Sinhala text for clipping, wrapping and font fallback.
- Add empty, loading and error states wherever content is fetched.

### P1 — Customer dashboard
- Replace local-only assumptions with an explicit cloud-loading state once cloud integration is approved.
- Keep local drafts intact. Never upload local drafts automatically; offer a clear import/restore choice.
- Show useful states: no invitations, loading, load failure, draft, live and completed.
- Add create invitation, open workspace and delete confirmation flows.

### P2 — Invitation editor and media
- Preserve the current event-workspace features while moving persistence to the cloud.
- Store uploaded photos/videos in Supabase Storage, not as large data URLs in JSON.
- Validate file type and size; show upload progress and clear errors.
- Keep music playback user-initiated.
- Ensure the mobile preview reflects the actual published invitation.

### P2 — Guest experience
- Test public invitation view without customer login.
- Test RSVP validation, duplicate submissions, rate limiting and guest-specific access.
- Test guest gallery upload approval and guest book moderation.
- Test table QR and invited-mobile verification before enabling public uploads.

### P3 — Admin and business operations
- Admin-only order and customer management.
- Order status workflow and LKR pricing.
- Support contact and WhatsApp hand-off.
- Basic analytics for visits, template selection, conversion and RSVP completion.

## 5. Role ownership for this sprint

| Virtual team role | Responsibility |
|---|---|
| CEO / Project Manager | Scope, priorities, approval gates |
| Webpage Designer | Homepage visual consistency and responsive layout |
| UI/UX Designer | Customer journey, navigation and usability |
| Web Developer | Page structure, integration and browser compatibility |
| Frontend Developer | Interactive controls, validation and states |
| Backend / Database Engineer | Auth, RLS, data model and Storage |
| Cybersecurity Specialist | Ownership checks, public endpoints and upload controls |
| QA Engineer | Device, browser, accessibility and regression tests |
| Copywriter / Sinhala reviewer | Clear bilingual content |
| Creative Studio | Template artwork, animation and video assets |

These are virtual project roles coordinated by the assistant, not separately hired human employees.

## 6. Acceptance checklist before any release

- [ ] Homepage links and all visible buttons work.
- [ ] Mobile navigation works without horizontal overflow.
- [ ] Sinhala and English layouts are readable.
- [ ] Login, registration, email confirmation and password reset tested in a real browser.
- [ ] Customer dashboard is protected by authentication.
- [ ] Two test customer accounts cannot access each other's invitations.
- [ ] Local drafts are not silently overwritten or uploaded.
- [ ] Public invitation and RSVP work without exposing private customer data.
- [ ] Media uploads enforce size and MIME restrictions.
- [ ] No secrets appear in frontend source or repository history.
- [ ] Critical console/network errors resolved.
- [ ] QA evidence recorded before merge or deployment.

## 7. Approval gate still outstanding

The proposed additive `workspace_data` JSONB column on `public.invitations` has **not** been applied. Cloud dashboard integration depends on this schema decision. The user was previously asked to approve that migration; no approval has been received yet.

Until explicit approval is received:
- Do not run the migration.
- Do not claim dashboard cloud persistence is complete.
- Continue with safe read-only review, UI work and documentation.
- Do not merge or deploy the open draft pull request without explicit approval.

## 8. Immediate next execution task

Complete a page-by-page browser QA pass of `index.html`, `login.html`, `dashboard.html` and `event-workspace.html`; record exact defects and fix them on the development branch. Then wire the auth guard before any cloud data integration.
