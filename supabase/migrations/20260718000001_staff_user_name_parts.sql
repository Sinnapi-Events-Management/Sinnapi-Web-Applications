-- =====================================================================
-- Sinnapi — 0022 Staff users: split name parts on profiles
--
-- The admin-portal Users page now provisions and edits Sinnapi *staff* accounts
-- with separate First / Middle / Last name fields, so `profiles` gains three
-- nullable columns to store them. `full_name` stays the not-null display value
-- and is kept as the composed "first middle last" — every writer (the
-- create-staff Edge Function, the admin edit flow, and `handle_new_user`) sets
-- both, so the two never drift.
--
-- Backwards compatible: the columns are nullable, so existing self-service
-- signups (client / event_planner) simply leave them null and keep deriving
-- full_name from user_metadata exactly as before.
-- =====================================================================

alter table public.profiles
  add column if not exists first_name  text,
  add column if not exists middle_name text,
  add column if not exists last_name   text;

-- ---------------------------------------------------------------------
-- Recreate the signup trigger. Unchanged from 0021 except it now carries the
-- name parts through from user_metadata when present. full_name falls back from
-- an explicit `full_name` → the composed parts → the email local-part, so it is
-- never null regardless of which fields a caller supplies.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role   text := coalesce(new.raw_user_meta_data->>'role', 'client');
  v_first  text := nullif(btrim(coalesce(new.raw_user_meta_data->>'first_name','')), '');
  v_middle text := nullif(btrim(coalesce(new.raw_user_meta_data->>'middle_name','')), '');
  v_last   text := nullif(btrim(coalesce(new.raw_user_meta_data->>'last_name','')), '');
  v_full   text := nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name','')), '');
begin
  -- Only client/event_planner may self-register; staff and vendors are
  -- provisioned server-side (create-staff / promote-intake), which assign the
  -- real roles explicitly after this trigger runs.
  if v_role not in ('client','event_planner') then v_role := 'client'; end if;

  insert into public.profiles(id, full_name, first_name, middle_name, last_name, email, phone, status)
  values (
    new.id,
    coalesce(
      v_full,
      nullif(btrim(concat_ws(' ', v_first, v_middle, v_last)), ''),
      split_part(new.email, '@', 1)
    ),
    v_first,
    v_middle,
    v_last,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data->>'phone','')), ''),
    'active'
  )
  on conflict (id) do nothing;

  insert into public.user_roles(profile_id, role_id)
  select new.id, r.id from public.roles r where r.key = v_role
  on conflict do nothing;

  return new;
end;$$;

-- ---------------------------------------------------------------------
-- Best-effort backfill so the edit form shows sensible values for accounts
-- created before this migration: first token → first_name, last token →
-- last_name (only when there is more than one token), everything between →
-- middle_name. Only touches rows where all three parts are still null, so it is
-- safe to re-run and never clobbers values a later edit has set explicitly.
-- ---------------------------------------------------------------------
update public.profiles p
set
  first_name  = split_part(btrim(p.full_name), ' ', 1),
  last_name   = case
                  when array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1) > 1
                  then (regexp_split_to_array(btrim(p.full_name), '\s+'))[
                         array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1)]
                end,
  middle_name = case
                  when array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1) > 2
                  then array_to_string(
                         (regexp_split_to_array(btrim(p.full_name), '\s+'))
                           [2:array_length(regexp_split_to_array(btrim(p.full_name), '\s+'), 1) - 1],
                         ' ')
                end
where p.full_name is not null
  and btrim(p.full_name) <> ''
  and p.first_name is null
  and p.middle_name is null
  and p.last_name is null;
