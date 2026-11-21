# Customer authentication foundation — 2026-11-19

## Implemented on development branch

- Added `assets/js/supabase-client.js` using the project's Supabase URL and publishable key.
- Pinned the browser SDK CDN import to `@supabase/supabase-js@2.119.1`.
- Added `login.html` with email/password sign-in, account registration, password reset request, and English/Sinhala language preference capture.
- Registration passes `full_name`, `phone`, and `preferred_language` as auth user metadata. The existing database trigger creates a `profiles` row and assigns role `customer`; it does not trust client-supplied role metadata.
- Added a Customer Login link to the public website and a Customer Account link to the dashboard sidebar.

## Security notes

- The browser uses only the publishable key. No service-role/secret key is present in these files.
- Customer authorization must continue to be enforced by RLS; hiding links or guarding a page in JavaScript is not a security boundary.
- The existing dashboard still uses localStorage for invitation state and is not yet cloud-backed.
- The dashboard is not yet protected by a mandatory session guard. Do not describe the full customer portal as production-ready until route protection and owner-scoped CRUD are implemented and tested.
- Password reset and email confirmation depend on Supabase Auth email templates and the project's allowed redirect URL configuration.

## Manual QA still required

1. Add the deployed site URLs to Supabase Auth > URL Configuration:
   - Site URL: the chosen canonical website URL.
   - Redirect URLs: the matching `login.html` and `dashboard.html` paths on the GitHub Pages/custom domain used for testing.
2. Test registration with a new email and verify the confirmation email.
3. Confirm the trigger creates exactly one `profiles` row with role `customer`.
4. Test sign-in, wrong password, duplicate registration, and password reset.
5. Test sign-in on a second browser/device to confirm the Supabase session is restored.
6. Implement and test a server/RLS-backed dashboard session guard before treating dashboard data as private.
7. Implement cloud persistence for invitations, guests, orders and media; do not copy localStorage records into the database without explicit user review.

## Current delivery status

This is an authentication foundation in the development branch only. It has not been merged or deployed. Browser execution and email delivery have not yet been verified end-to-end.
