# MAGIC CREATIONS — connect the free database

This repository currently hosts a static website. The SQL schema below prepares a real database and access rules, but it does not automatically connect the existing pages to it yet.

## First setup (free-first)

1. Open https://supabase.com/ and create an account.
2. Create a new project. Choose the Free plan; select a strong database password and keep it private.
3. In the project, open **SQL Editor → New query**.
4. Open `supabase-schema.sql` in this repository, copy all its SQL, paste into the SQL Editor and click **Run**.
5. In Supabase, open **Project Settings → API** (or **Connect**, depending on the dashboard version) and find the **Project URL** and **publishable key** (older projects may label it `anon`). These are the browser-facing values used for a frontend when RLS is correctly configured.
6. **Never share or place the service_role / secret key in website files.** Never send your database password.
7. In **Authentication → URL Configuration**, add the website URL to allowed redirect URLs:
   `https://dgdammika585-sys.github.io/Magic-creation/`
   Also add the matching dashboard URL if needed:
   `https://dgdammika585-sys.github.io/Magic-creation/dashboard.html`

## Security notes

- Row Level Security (RLS) is enabled for all tables created by this script.
- Customers can only access their own invitation, guest, and order records under the included policies.
- Public invitation reads are restricted to published invitations; guestbook wishes are public only after approval.
- Admin access is not enabled automatically. After creating your own account and confirming the profile row exists, use the SQL Editor to promote only your own profile to admin. Do not make this change for customer accounts.
- Review policies before accepting real customer information or payments.

## Current limitations

The SQL creates the backend tables and access rules; it does **not** by itself add signup/login forms or connect the existing website pages. Those frontend integration steps are next. Supabase Free includes usage limits and projects may pause after a week of inactivity, so it is suitable for a first prototype, not a guarantee of uninterrupted production hosting. See the official [Supabase pricing](https://supabase.com/pricing) and [Auth docs](https://supabase.com/docs/guides/auth).
