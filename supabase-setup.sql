-- MAGIC CREATIONS: secure starter database
-- Run this entire file once in Supabase Dashboard > SQL Editor > New query.
-- Uses Supabase Auth ownership. Do not disable RLS.

create extension if not exists pgcrypto;

create table if not exists public.mc_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mc_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.mc_events(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  guest_code text not null unique,
  name text not null default '',
  phone text not null default '',
  side text not null default 'bride' check (side in ('bride','groom')),
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending','attending','not_attending')),
  guest_count integer not null default 1 check (guest_count between 0 and 50),
  note text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mc_events_owner_id_idx on public.mc_events(owner_id);
create index if not exists mc_guests_event_id_idx on public.mc_guests(event_id);
create index if not exists mc_guests_owner_id_idx on public.mc_guests(owner_id);

alter table public.mc_events enable row level security;
alter table public.mc_guests enable row level security;

drop policy if exists "Owners manage their events" on public.mc_events;
create policy "Owners manage their events"
on public.mc_events for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners manage their guests" on public.mc_guests;
create policy "Owners manage their guests"
on public.mc_guests for all
to authenticated
using (auth.uid() = owner_id)
with check (
  auth.uid() = owner_id
  and exists (
    select 1 from public.mc_events e
    where e.id = event_id and e.owner_id = auth.uid()
  )
);

-- Public invitation lookup: guests only receive the event and guest data
-- associated with their own private guest_code. Never expose the full guest list.
create or replace function public.mc_get_public_invitation(p_slug text, p_guest_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'event', e.payload || jsonb_build_object(
      'id', e.id,
      'slug', e.slug,
      'title', e.title,
      'status', e.status
    ),
    'guest', jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'side', g.side,
      'rsvp_status', g.rsvp_status,
      'guest_count', g.guest_count,
      'note', g.note
    )
  )
  from public.mc_events e
  join public.mc_guests g on g.event_id = e.id
  where e.slug = p_slug
    and e.status = 'published'
    and g.guest_code = p_guest_code
  limit 1;
$$;

-- Guests can update only their own RSVP through their unique invitation code.
create or replace function public.mc_submit_rsvp(
  p_slug text,
  p_guest_code text,
  p_status text,
  p_guest_count integer,
  p_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_status not in ('attending','not_attending') then
    raise exception 'Invalid RSVP status';
  end if;
  if p_guest_count < 0 or p_guest_count > 50 then
    raise exception 'Invalid guest count';
  end if;

  update public.mc_guests g
  set rsvp_status = p_status,
      guest_count = p_guest_count,
      note = left(coalesce(p_note,''), 1000)
  from public.mc_events e
  where g.event_id = e.id
    and e.slug = p_slug
    and e.status = 'published'
    and g.guest_code = p_guest_code;

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.mc_get_public_invitation(text,text) from public;
grant execute on function public.mc_get_public_invitation(text,text) to anon, authenticated;
revoke all on function public.mc_submit_rsvp(text,text,text,integer,text) from public;
grant execute on function public.mc_submit_rsvp(text,text,text,integer,text) to anon, authenticated;

-- Public image delivery; uploads remain restricted to authenticated owners.
insert into storage.buckets (id, name, public)
values ('mc-invitation-media', 'mc-invitation-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Owners upload invitation media" on storage.objects;
create policy "Owners upload invitation media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mc-invitation-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners update invitation media" on storage.objects;
create policy "Owners update invitation media"
on storage.objects for update to authenticated
using (
  bucket_id = 'mc-invitation-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'mc-invitation-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Owners delete invitation media" on storage.objects;
create policy "Owners delete invitation media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mc-invitation-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public reads are enabled by the bucket's public setting.
