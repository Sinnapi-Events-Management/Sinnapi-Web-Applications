-- =====================================================================
-- Sinnapi — 0829c Public identifiers: profiles
--
-- `profiles` cannot use `install_public_id`, because its prefix is not a
-- constant. An account is `SA`, `SC` or `SP` depending on what it is:
--
--   SA  Sinnapi Admin    staff, provisioned by the create-staff function
--   SC  Sinnapi Client   the default; anyone who signed up to book
--   SP  Sinnapi Planner  self-registered as an event planner
--
-- THE PREFIX IS FROZEN AT SIGNUP AND NEVER RECOMPUTED
-- An account may hold several roles at once — 20260618000003 says so in
-- as many words, and `user_roles` is deliberately many-to-many — so
-- "the account's role" is not a function of the current role set and
-- cannot be one. Deriving the prefix from the *current* roles would make
-- the identifier mutable: a client promoted to staff would silently stop
-- being `SC48213MQH` and start being some `SA...`, which breaks the one
-- job the identifier has. Every support ticket, audit log line and email
-- quoting the old value would then name nothing.
--
-- So the prefix records what the account was created as, permanently.
--
-- A VENDOR'S OWNER IS `SC`, NOT `SV`, AND THAT IS CORRECT
-- Vendors are not signed up as vendors: `promote-intake` creates an
-- ordinary account and `approve_vendor` grants it the vendor role later.
-- The business is a separate row in `vendors` and carries its own `SV`
-- identifier (20260829000002). The two are different things — a person
-- and a listing — and giving them one identifier between them would be
-- wrong even if the timing allowed it. A vendor therefore legitimately
-- has both: `SC…` as an account holder, `SV…` as a business.
--
-- ---------------------------------------------------------------------
-- WHY THE ROLE IS READ FROM `auth.users`, NOT FROM `user_roles`
-- The obvious source is wrong here, for a sequencing reason. Roles are
-- granted *after* the profile row exists — they have to be, since
-- `user_roles.profile_id` references it — so at BEFORE INSERT on
-- `profiles` the role set is necessarily empty. Waiting for the grant
-- instead (an AFTER INSERT trigger on `user_roles`) has a worse problem
-- in both directions:
--
--   * the column could not be NOT NULL, since a profile is briefly
--     real with no roles and hence no identifier; and
--   * it would read the *wrong* role for staff. `handle_new_user` grants
--     every server-provisioned account the default `client` role, and
--     `create-staff` deletes it and inserts the real staff roles
--     immediately afterwards. A trigger on the grant would fire on the
--     transient `client` row and freeze `SC` onto an admin account.
--
-- `auth.users.raw_user_meta_data` has neither problem: the auth row is
-- created first (the FK proves it exists by the time this trigger runs)
-- and it carries the caller's stated intent before any grant happens.
-- `create-staff` is amended alongside this migration to state `role:
-- 'staff'` there; the accompanying code change is in
-- supabase/functions/create-staff/index.ts.
--
-- Note what is *not* being trusted. The metadata chooses a display
-- prefix and nothing else. It has never been allowed to choose a role —
-- `handle_new_user` still admits only `client` and `event_planner` for
-- self-registration, and every privileged grant still happens
-- server-side — so the worst an attacker can do by hand-crafting
-- metadata at signup is mint themselves a cosmetically `SA`-prefixed
-- identifier that carries no permission whatsoever. That is a vanity
-- string, not an escalation: nothing in the platform reads a prefix to
-- decide anything, and `is_admin` is still what every policy consults.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Prefix from signup intent.
--
-- Reads `auth.users` and is therefore SECURITY DEFINER: the trigger runs
-- as the signing-up user, who has no access to that schema.
-- ---------------------------------------------------------------------
create or replace function public.profile_public_id_prefix(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_meta jsonb;
  v_role text;
begin
  select u.raw_user_meta_data into v_meta from auth.users u where u.id = p_user_id;

  v_role := lower(btrim(coalesce(v_meta->>'role', '')));

  return case
           when v_role = 'staff'         then 'SA'
           when v_role = 'event_planner' then 'SP'
           else                               'SC'   -- the default, and the vendor owner's
         end;
end;
$$;

comment on function public.profile_public_id_prefix(uuid) is
  'SA / SP / SC from the account''s signup metadata. Cosmetic only — never consulted for authorisation.';

-- ---------------------------------------------------------------------
-- Same contract as `tg_assign_public_id`: assign on insert, freeze
-- thereafter. Separate only because the prefix is computed per row.
-- ---------------------------------------------------------------------
create or replace function public.tg_assign_profile_public_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.public_id := public.mint_public_id(
      public.profile_public_id_prefix(new.id),
      'public.profiles',
      new.id
    );
    return new;
  end if;

  if new.public_id is distinct from old.public_id then
    raise exception 'public_id is immutable (% -> %)', old.public_id, new.public_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

alter table public.profiles add column if not exists public_id text;

-- ---------------------------------------------------------------------
-- BACKFILL — from `user_roles`, because signup metadata is not reliable
-- for accounts that already exist.
--
-- This is the one place the role set is the right source: for a row
-- already in the table the grants have long since settled, so they
-- describe the account better than whatever was in its metadata at
-- signup. Staff first (an `is_admin` grant is unambiguous), then planner,
-- then the client default — an account holding both client and planner
-- roles reads as a planner, which is the more specific fact.
--
-- Row at a time, for the reason given in `install_public_id`.
-- ---------------------------------------------------------------------
do $$
declare
  v_row    record;
  v_prefix text;
  v_count  int := 0;
begin
  for v_row in
    select p.id,
           bool_or(r.is_admin)                        as is_staff,
           bool_or(r.key = 'event_planner')           as is_planner
    from public.profiles p
    left join public.user_roles ur on ur.profile_id = p.id
    left join public.roles      r  on r.id = ur.role_id
    where p.public_id is null
    group by p.id
    order by p.id
  loop
    v_prefix := case
                  when v_row.is_staff   then 'SA'
                  when v_row.is_planner then 'SP'
                  else                       'SC'
                end;
    update public.profiles
       set public_id = public.mint_public_id(v_prefix, 'public.profiles', v_row.id)
     where id = v_row.id;
    v_count := v_count + 1;
  end loop;

  raise notice 'public_id: public.profiles — % row(s) backfilled', v_count;
end;
$$;

alter table public.profiles alter column public_id set not null;

create unique index if not exists ux_profiles_public_id on public.profiles(public_id);

drop trigger if exists trg_public_id on public.profiles;
create trigger trg_public_id
  before insert or update of public_id on public.profiles
  for each row execute function public.tg_assign_profile_public_id();

comment on column public.profiles.public_id is
  'Public account identifier shown to users, e.g. SC48213MQH. Prefix records what the account was created as (SA staff / SP planner / SC client) and never changes. Display and lookup only — never a join key; use id.';

revoke execute on function public.profile_public_id_prefix(uuid) from public, anon, authenticated;
