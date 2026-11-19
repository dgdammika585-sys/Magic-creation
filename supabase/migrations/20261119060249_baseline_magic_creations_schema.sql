-- MAGIC CREATIONS: initial Supabase database schema
-- Run this in Supabase Dashboard > SQL Editor > New query.
-- Safe starting point: private customer-owned rows are protected with RLS.
-- Never put a Supabase service_role/secret key in website files.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  preferred_language text not null default 'en' check (preferred_language in ('en','si')),
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  event_type text not null default 'wedding',
  couple_or_host_names text not null default '',
  event_date date,
  event_time text not null default '',
  venue text not null default '',
  venue_address text not null default '',
  language text not null default 'en' check (language in ('en','si','both')),
  template_key text not null default 'classic',
  accent_colour text not null default '#8c6b85',
  message text not null default '',
  video_url text not null default '',
  audio_url text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete set null,
  order_number text not null unique default ('MC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  service_type text not null default 'digital_invitation',
  status text not null default 'pending' check (status in ('pending','confirmed','in_progress','review','completed','cancelled')),
  amount_lkr numeric(12,2) not null default 0 check (amount_lkr >= 0),
  customer_note text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null,
  guest_phone text not null default '',
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending','attending','not_attending')),
  guest_count integer not null default 1 check (guest_count >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_name text not null default 'Guest',
  message text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists invitations_owner_id_idx on public.invitations(owner_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists guests_invitation_id_idx on public.guests(invitation_id);
create index if not exists guestbook_invitation_approved_idx on public.guestbook_entries(invitation_id, approved);

-- Helper used by admin-only policies. SECURITY DEFINER avoids recursive profile RLS checks.
create or replace function public.is_magic_creations_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.orders enable row level security;
alter table public.guests enable row level security;
alter table public.guestbook_entries enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.is_magic_creations_admin());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = 'customer');
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
for insert to authenticated with check (id = (select auth.uid()) and role = 'customer');

drop policy if exists "invitations owner or admin select" on public.invitations;
create policy "invitations owner or admin select" on public.invitations
for select to authenticated using (owner_id = (select auth.uid()) or public.is_magic_creations_admin());
drop policy if exists "invitations owner insert" on public.invitations;
create policy "invitations owner insert" on public.invitations
for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "invitations owner update" on public.invitations;
create policy "invitations owner update" on public.invitations
for update to authenticated using (owner_id = (select auth.uid()) or public.is_magic_creations_admin())
with check (owner_id = (select auth.uid()) or public.is_magic_creations_admin());
drop policy if exists "invitations owner delete" on public.invitations;
create policy "invitations owner delete" on public.invitations
for delete to authenticated using (owner_id = (select auth.uid()) or public.is_magic_creations_admin());

drop policy if exists "orders customer or admin select" on public.orders;
create policy "orders customer or admin select" on public.orders
for select to authenticated using (customer_id = (select auth.uid()) or public.is_magic_creations_admin());
drop policy if exists "orders customer insert" on public.orders;
create policy "orders customer insert" on public.orders
for insert to authenticated with check (customer_id = (select auth.uid()));
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
for update to authenticated using (public.is_magic_creations_admin()) with check (public.is_magic_creations_admin());

drop policy if exists "guests owner or admin select" on public.guests;
create policy "guests owner or admin select" on public.guests
for select to authenticated using (owner_id = (select auth.uid()) or public.is_magic_creations_admin());
drop policy if exists "guests owner insert" on public.guests;
create policy "guests owner insert" on public.guests
for insert to authenticated with check (
  owner_id = (select auth.uid()) and exists (
    select 1 from public.invitations i where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
);
drop policy if exists "guests owner update" on public.guests;
create policy "guests owner update" on public.guests
for update to authenticated using (owner_id = (select auth.uid()) or public.is_magic_creations_admin())
with check (owner_id = (select auth.uid()) or public.is_magic_creations_admin());
drop policy if exists "guests owner delete" on public.guests;
create policy "guests owner delete" on public.guests
for delete to authenticated using (owner_id = (select auth.uid()) or public.is_magic_creations_admin());

-- Public visitors may read only published invitation details.
drop policy if exists "public read published invitations" on public.invitations;
create policy "public read published invitations" on public.invitations
for select to anon using (published = true);

-- Public visitors can read approved wishes and submit unapproved wishes.
drop policy if exists "public read approved wishes" on public.guestbook_entries;
create policy "public read approved wishes" on public.guestbook_entries
for select to anon, authenticated using (approved = true or public.is_magic_creations_admin());
drop policy if exists "public submit wish" on public.guestbook_entries;
create policy "public submit wish" on public.guestbook_entries
for insert to anon, authenticated with check (approved = false and length(trim(message)) between 1 and 1000);

-- IMPORTANT: promote your own account to admin only after signing up, by running:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
-- Do this only for your own account in the Supabase SQL Editor.


-- Explicit API privileges; RLS policies above still decide which rows are accessible.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;
grant select, insert on public.orders to authenticated;
grant update on public.orders to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select on public.invitations to anon;
grant select, insert on public.guestbook_entries to anon, authenticated;
grant select on public.guestbook_entries to authenticated;
