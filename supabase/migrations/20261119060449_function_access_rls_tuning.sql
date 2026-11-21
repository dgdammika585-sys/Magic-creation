begin;

revoke all on function public.is_magic_creations_admin() from public, anon;
grant execute on function public.is_magic_creations_admin() to authenticated;

drop policy if exists "public read approved wishes" on public.guestbook_entries;
drop policy if exists "invitation owners read guestbook submissions" on public.guestbook_entries;
create policy "anon read approved wishes" on public.guestbook_entries
for select to anon using (approved = true);
create policy "authenticated read approved or owned wishes" on public.guestbook_entries
for select to authenticated
using (
  approved = true
  or exists (
    select 1 from public.invitations i
     where i.id = invitation_id and i.owner_id = (select auth.uid())
  )
  or public.is_magic_creations_admin()
);

drop policy if exists "Owners manage their events" on public.mc_events;
create policy "Owners manage their events" on public.mc_events
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners manage their guests" on public.mc_guests;
create policy "Owners manage their guests" on public.mc_guests
for all to authenticated
using ((select auth.uid()) = owner_id)
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1 from public.mc_events e
     where e.id = event_id and e.owner_id = (select auth.uid())
  )
);

commit;