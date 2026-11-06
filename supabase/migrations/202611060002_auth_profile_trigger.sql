-- MAGIC CREATIONS — create a safe customer profile after Supabase Auth signup
-- Apply after supabase-schema.sql and the guest token migration.
-- Every new auth user receives a customer profile; public metadata cannot grant admin.

begin;

create or replace function public.handle_new_magic_creations_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    preferred_language,
    role
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), ''),
    case
      when new.raw_user_meta_data ->> 'preferred_language' = 'si' then 'si'
      else 'en'
    end,
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_magic_creations_user() from public, anon, authenticated;

drop trigger if exists on_magic_creations_auth_user_created on auth.users;
create trigger on_magic_creations_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_magic_creations_user();

commit;
