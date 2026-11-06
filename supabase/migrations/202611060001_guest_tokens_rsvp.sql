-- MAGIC CREATIONS — secure guest links, seating and RSVP
-- Apply after supabase-schema.sql in Supabase SQL Editor.
-- Public guests never receive direct SELECT access to guests or token tables.

begin;

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  capacity integer not null check (capacity between 1 and 100),
  created_at timestamptz not null default now(),
  unique (id, invitation_id)
);

alter table public.guests
  add column if not exists table_id uuid references public.seating_tables(id) on delete set null,
  add column if not exists rsvp_responded_at timestamptz;

-- Prevent a table from being moved to a different event or reduced below
-- the number of seats already assigned.
create or replace function public.validate_seating_table_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occupied integer;
begin
  if new.invitation_id <> old.invitation_id or new.owner_id <> old.owner_id then
    raise exception 'A seating table cannot be moved to another event or owner.';
  end if;

  select coalesce(sum(g.guest_count), 0)::integer
    into v_occupied
    from public.guests g
   where g.table_id = old.id;

  if new.capacity < v_occupied then
    raise exception 'Table capacity cannot be lower than its current assigned guest count.';
  end if;

  return new;
end;
$;

drop trigger if exists seating_tables_validate_update on public.seating_tables;
create trigger seating_tables_validate_update
before update of invitation_id, owner_id, capacity
on public.seating_tables
for each row execute function public.validate_seating_table_update();

revoke all on function public.validate_seating_table_update() from public, anon, authenticated;
revoke all on function public.validate_guest_table_capacity() from public, anon, authenticated;

alter table public.invitations
  add column if not exists show_guest_table boolean not null default false;

create table if not exists public.guest_invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists guest_tokens_guest_active_idx
  on public.guest_invitation_tokens(guest_id, expires_at)
  where revoked_at is null;

create table if not exists public.guest_rsvp_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  invitation_id uuid not null references public.invitations(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  response text not null check (response in ('attending','not_attending')),
  created_at timestamptz not null default now()
);

create index if not exists guest_rsvp_events_invitation_idx
  on public.guest_rsvp_events(invitation_id, created_at desc);
create index if not exists guest_rsvp_events_guest_idx
  on public.guest_rsvp_events(guest_id, created_at desc);

-- Keep table capacity correct even if an authenticated owner writes directly
-- to guests.table_id rather than using the helper RPC.
create or replace function public.validate_guest_table_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_invitation_id uuid;
  v_used integer;
begin
  if new.table_id is null then
    return new;
  end if;

  select st.capacity, st.invitation_id
    into v_capacity, v_invitation_id
    from public.seating_tables st
   where st.id = new.table_id
   for update;

  if not found or v_invitation_id <> new.invitation_id then
    raise exception 'The selected table does not belong to this invitation.';
  end if;

  select coalesce(sum(g.guest_count), 0)::integer
    into v_used
    from public.guests g
   where g.table_id = new.table_id
     and g.id <> new.id;

  if v_used + new.guest_count > v_capacity then
    raise exception 'This table does not have enough remaining seats.';
  end if;

  return new;
end;
$$;

drop trigger if exists guests_validate_table_capacity on public.guests;
create trigger guests_validate_table_capacity
before insert or update of table_id, guest_count, invitation_id
on public.guests
for each row execute function public.validate_guest_table_capacity();

alter table public.seating_tables enable row level security;
alter table public.guest_invitation_tokens enable row level security;
alter table public.guest_rsvp_events enable row level security;

drop policy if exists "seating owner select" on public.seating_tables;
create policy "seating owner select" on public.seating_tables
for select to authenticated
using (owner_id = (select auth.uid()) or public.is_magic_creations_admin());

drop policy if exists "seating owner insert" on public.seating_tables;
create policy "seating owner insert" on public.seating_tables
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
);

drop policy if exists "seating owner update" on public.seating_tables;
create policy "seating owner update" on public.seating_tables
for update to authenticated
using (owner_id = (select auth.uid()) or public.is_magic_creations_admin())
with check (owner_id = (select auth.uid()) or public.is_magic_creations_admin());

drop policy if exists "seating owner delete" on public.seating_tables;
create policy "seating owner delete" on public.seating_tables
for delete to authenticated
using (owner_id = (select auth.uid()) or public.is_magic_creations_admin());

-- Token hashes and RSVP history are server-managed only.
revoke all on public.guest_invitation_tokens from anon, authenticated;
revoke all on public.guest_rsvp_events from anon, authenticated;
grant all on public.guest_invitation_tokens to service_role;
grant all on public.guest_rsvp_events to service_role;

drop policy if exists "rsvp history owner read" on public.guest_rsvp_events;
create policy "rsvp history owner read" on public.guest_rsvp_events
for select to authenticated
using (
  exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
  or public.is_magic_creations_admin()
);

grant select on public.guest_rsvp_events to authenticated;

grant select, insert, update, delete on public.seating_tables to authenticated;

-- Create a one-time visible token for the owner to place in a private guest link.
-- The raw token is returned once; only its SHA-256 hash is stored.
create or replace function public.issue_guest_invitation_token(p_guest_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invitation_id uuid;
  v_event_date date;
  v_token text;
  v_expires_at timestamptz;
begin
  if v_uid is null then
    raise exception 'Sign in is required.';
  end if;

  select g.invitation_id, i.event_date
    into v_invitation_id, v_event_date
    from public.guests g
    join public.invitations i on i.id = g.invitation_id
   where g.id = p_guest_id
     and i.owner_id = v_uid;

  if not found then
    raise exception 'Guest not found for this account.';
  end if;

  update public.guest_invitation_tokens
     set revoked_at = now()
   where guest_id = p_guest_id
     and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := greatest(
    now() + interval '90 days',
    coalesce(v_event_date::timestamptz + interval '30 days', now() + interval '90 days')
  );

  insert into public.guest_invitation_tokens (
    invitation_id, guest_id, token_hash, expires_at
  ) values (
    v_invitation_id,
    p_guest_id,
    encode(extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex'),
    v_expires_at
  );

  return jsonb_build_object('token', v_token, 'expires_at', v_expires_at);
end;
$$;

revoke all on function public.issue_guest_invitation_token(uuid) from public, anon;
grant execute on function public.issue_guest_invitation_token(uuid) to authenticated;

-- Assign or unassign a guest table. Ownership and capacity are checked here.
create or replace function public.assign_guest_table(
  p_guest_id uuid,
  p_table_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invitation_id uuid;
  v_guest_count integer;
  v_capacity integer;
  v_used integer;
  v_table_name text;
begin
  if v_uid is null then
    raise exception 'Sign in is required.';
  end if;

  select g.invitation_id, g.guest_count
    into v_invitation_id, v_guest_count
    from public.guests g
    join public.invitations i on i.id = g.invitation_id
   where g.id = p_guest_id and i.owner_id = v_uid;

  if not found then
    raise exception 'Guest not found for this account.';
  end if;

  if p_table_id is null then
    update public.guests set table_id = null where id = p_guest_id;
    return jsonb_build_object('guest_id', p_guest_id, 'table_id', null, 'table_name', null);
  end if;

  select st.capacity, st.table_name
    into v_capacity, v_table_name
    from public.seating_tables st
   where st.id = p_table_id and st.invitation_id = v_invitation_id and st.owner_id = v_uid
   for update;

  if not found then
    raise exception 'Table not found for this invitation.';
  end if;

  select coalesce(sum(g.guest_count), 0)::integer
    into v_used
    from public.guests g
   where g.table_id = p_table_id and g.id <> p_guest_id;

  if v_used + v_guest_count > v_capacity then
    raise exception 'This table does not have enough remaining seats.';
  end if;

  update public.guests set table_id = p_table_id where id = p_guest_id;

  return jsonb_build_object(
    'guest_id', p_guest_id,
    'table_id', p_table_id,
    'table_name', v_table_name,
    'occupied_after_assignment', v_used + v_guest_count,
    'capacity', v_capacity
  );
end;
$$;

revoke all on function public.assign_guest_table(uuid, uuid) from public, anon;
grant execute on function public.assign_guest_table(uuid, uuid) to authenticated;

-- The Edge Function uses the service role to call this transactional RSVP writer.
-- A repeated request_id is idempotent and does not create a second history row.
create or replace function public.submit_guest_rsvp(
  p_token_hash text,
  p_response text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest_id uuid;
  v_invitation_id uuid;
  v_guest_name text;
  v_guest_count integer;
  v_status text;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
     or p_response not in ('attending','not_attending')
     or p_request_id is null then
    raise exception 'Invalid RSVP request.';
  end if;

  select g.id, g.invitation_id, g.guest_name, g.guest_count
    into v_guest_id, v_invitation_id, v_guest_name, v_guest_count
    from public.guest_invitation_tokens t
    join public.guests g on g.id = t.guest_id and g.invitation_id = t.invitation_id
    join public.invitations i on i.id = t.invitation_id
   where t.token_hash = p_token_hash
     and t.revoked_at is null
     and t.expires_at > now()
     and i.published = true
   for update of g;

  if not found then
    raise exception 'This invitation link is invalid or has expired.';
  end if;

  insert into public.guest_rsvp_events (
    request_id, invitation_id, guest_id, response
  ) values (
    p_request_id, v_invitation_id, v_guest_id, p_response
  ) on conflict (request_id) do nothing;

  if not found then
    select g.rsvp_status into v_status
      from public.guests g where g.id = v_guest_id;
    return jsonb_build_object(
      'saved', true, 'idempotent', true,
      'guest_name', v_guest_name, 'rsvp_status', v_status
    );
  end if;

  update public.guests
     set rsvp_status = p_response,
         rsvp_responded_at = now()
   where id = v_guest_id;

  return jsonb_build_object(
    'saved', true, 'idempotent', false,
    'guest_name', v_guest_name,
    'guest_count', v_guest_count,
    'rsvp_status', p_response
  );
end;
$$;

revoke all on function public.submit_guest_rsvp(text, text, uuid) from public, anon, authenticated;
grant execute on function public.submit_guest_rsvp(text, text, uuid) to service_role;

commit;
