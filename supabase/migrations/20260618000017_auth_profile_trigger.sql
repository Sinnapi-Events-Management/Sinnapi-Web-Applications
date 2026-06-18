-- =====================================================================
-- Sinnapi — 0017 Auth: provision profile + default role on signup
-- Standard Supabase pattern: when a new auth.users row is created, mirror it
-- into public.profiles and assign the role chosen at sign-up (default client).
-- Role assignment must be privileged (RLS blocks self-grant), hence DEFINER.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(new.raw_user_meta_data->>'role', 'client');
begin
  -- only client/event_planner can self-register; vendors go through application
  if v_role not in ('client','event_planner') then v_role := 'client'; end if;

  insert into public.profiles(id, full_name, email, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email,
    'active'
  )
  on conflict (id) do nothing;

  insert into public.user_roles(profile_id, role_id)
  select new.id, r.id from public.roles r where r.key = v_role
  on conflict do nothing;

  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
