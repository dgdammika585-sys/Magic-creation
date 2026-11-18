# MAGIC CREATIONS — Project Completion Roadmap

**Owner:** MAGIC CREATIONS  
**Project:** Sri Lankan digital invitation platform  
**Baseline:** Existing `main` branch  
**Working branch:** `ceo/project-completion-2026-11-18`  
**Date:** 2026-11-18

## Delivery principles

1. Preserve the existing working product and design assets.
2. Work on a dedicated branch; do not push unreviewed changes directly to `main`.
3. Never commit Supabase service-role keys, payment secrets, passwords, or customer personal data.
4. Treat a feature as complete only after implementation, testing, and verification.
5. Prefer free/low-cost services until real usage justifies paid infrastructure.
6. Sinhala and English support, Sri Lankan user experience, and mobile-first quality are product requirements.

## Baseline audit — evidence observed in repository

- Existing website and app files include `index.html`, `dashboard.html`, `dashboard-live.html`, and `event-workspace.html`.
- Existing Supabase assets include `supabase/config.toml`, migrations, shared/function code, and guest lookup / RSVP Edge Function folders.
- Existing invitation templates include Forever Story, Five Hearts Date Reveal, Heritage Master, Golden Heritage Video, Dreamy Fairytale Video, Poruwa Floral Story, and additional couple-specific templates.
- The dashboard and event workspace currently use browser `localStorage` for at least part of their data flow. This is not a cross-device customer database.
- The SQL schema requires a security review before production. In particular, customer-controlled order fields such as status, amount, and admin notes must not be trusted.
- Repository root did not expose a `package.json` or Wrangler configuration in the audit performed on 2026-11-18. Confirm the actual deployment configuration before changing hosting.
- Supabase project connection, production deployment, payment provider, and live customer authentication have **not** been verified from repository inspection alone.

## Release roadmap

### Phase 0 — Baseline and safe development
- [x] Inspect the existing repository and key app/template/backend files.
- [x] Create a dedicated development branch from `main`.
- [ ] Capture a full file inventory and confirm the current production URL/deployment.
- [ ] Confirm the Supabase project exists and identify the active migration state without exposing secrets.
- [ ] Establish a repeatable preview/test procedure.

### Phase 1 — Security and data foundation
- [ ] Review every table, RLS policy, trigger, RPC, and Edge Function.
- [ ] Ensure users can read/write only their own profiles, events, orders, guests, and media.
- [ ] Make order price/status/admin fields server-controlled; never trust client-supplied totals or approval state.
- [ ] Secure guest tokens and RSVP endpoints; add validation, abuse protection, and rate limits.
- [ ] Define storage buckets and policies for customer uploads and guest gallery content.
- [ ] Apply migrations to a non-production/test Supabase project and verify them.

**Exit criteria:** Security tests pass; unauthorised cross-user access is denied; secrets are not present in client code or Git history.

### Phase 2 — Identity and customer dashboard
- [ ] Implement sign-up, sign-in, sign-out, password recovery, and profile management.
- [ ] Connect invitations/events to the authenticated customer account.
- [ ] Replace local-only persistence for business-critical records with Supabase.
- [ ] Consolidate duplicate dashboard entry points into one canonical flow.
- [ ] Verify customer data persists across devices and sessions.

**Exit criteria:** A test customer can register, sign in on another device, and see only their own saved invitations.

### Phase 3 — Invitation creation and editor
- [ ] Implement template selection and custom invitation creation.
- [ ] Implement one-time unique invitation slug generation and collision handling.
- [ ] Persist event details, section visibility/order/content, theme, fonts, and layout settings.
- [ ] Implement reliable image/video upload with file type/size checks and progress/error states.
- [ ] Implement mobile/desktop live preview and save/reload.
- [ ] Implement animations, background effects, music controls, and reduced-motion support.
- [ ] Preserve the approved Forever Story / three-heart reveal visual specification.

**Exit criteria:** A customer can create, edit, save, reload, preview, and publish a working invitation without losing data.

### Phase 4 — Guest and event management
- [ ] Guest management and invitation-specific guest lists.
- [ ] RSVP links/tokens, plus-one rules, attendance reporting, and export.
- [ ] Agenda and event details.
- [ ] Table plan with capacity validation and guest assignments.
- [ ] Guest gallery with QR access, invited-guest verification, owner moderation, and safe storage.
- [ ] Guest book with moderation and spam controls.
- [ ] Budget calculation.

**Exit criteria:** An event owner can manage guests and event information; invited guests can submit permitted responses/media; owner moderation works.

### Phase 5 — Orders, payments, and administration
- [ ] Define product tiers, custom work, revisions, delivery scope, and transparent LKR pricing.
- [ ] Build order creation and server-side price calculation.
- [ ] Add a suitable Sri Lankan payment provider only after account/merchant requirements are confirmed.
- [ ] Implement payment verification via trusted server callbacks/webhooks.
- [ ] Build admin order queue, approval, customer support notes, and audit trail.
- [ ] Add email/WhatsApp customer notifications where appropriate.

**Exit criteria:** Test orders can be created and tracked; payment status cannot be forged by the browser; admin actions are authenticated and logged.

### Phase 6 — Website content, creative production, and growth
- [ ] Professional Sinhala/English website copy and clear customer journey.
- [ ] Pricing, FAQ, terms, privacy policy, refund/cancellation and media consent pages.
- [ ] Consistent graphic identity and accessible typography.
- [ ] Individually QA each template on mobile and desktop.
- [ ] Produce original video and animation assets with appropriate rights.
- [ ] SEO metadata, analytics with privacy-conscious configuration, and social media launch assets.

**Exit criteria:** Public pages explain the service clearly; template previews are accurate; legal/customer information is visible.

### Phase 7 — Quality assurance and launch
- [ ] Test critical flows on current mobile and desktop browsers.
- [ ] Test Sinhala and English, slow networks, upload failures, and accessibility basics.
- [ ] Test backup/restore and data export.
- [ ] Run security checks and remove debug/test data.
- [ ] Configure domain, HTTPS, monitoring, error reporting, and support contact.
- [ ] Run a limited pilot with test customers before public launch.

**Exit criteria:** No critical/high severity defects remain; backups and recovery are tested; launch owner approves release.

## Current next task

**Phase 1, Task 1:** Read and review the complete Supabase SQL schema, both existing migrations, and every guest Edge Function. Produce a table-by-table RLS/security review before modifying production schema.

## Decisions that require owner input before irreversible or paid actions

- Production Supabase project and whether a separate test project is available.
- Final hosting/domain choice and production URL.
- Payment provider and merchant account.
- Final LKR pricing, refund policy, and order approval workflow.
- Terms, privacy, guest photo consent, and retention policy.

## Status convention

- `Not started`: no implementation evidence.
- `In progress`: implementation exists but acceptance tests are incomplete.
- `Verified`: tested against stated exit criteria.
- `Blocked`: requires credentials, account access, a business decision, or external service setup.
