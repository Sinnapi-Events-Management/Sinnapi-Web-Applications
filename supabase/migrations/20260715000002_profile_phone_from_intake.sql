-- =====================================================================
-- Sinnapi — 0021 Profiles: populate `phone` from the vendor intake
--
-- `public.profiles.phone` has never been written by anything: the signup
-- trigger below inserted only (id, full_name, email, status), and the
-- promote-intake Edge Function passed only full_name into user_metadata. The
-- applicant's phone was therefore collected by the public "Become a vendor"
-- form (vendor_application_intake.owner_phone is NOT NULL) and then dropped on
-- promotion, leaving every profile with a null phone.
--
-- This migration closes the trigger half of the gap and backfills the rows
-- already affected. The Edge Function half (covering vendors promoted onto a
-- pre-existing profile, which this trigger never fires for) is handled in
-- supabase/functions/promote-intake.
--
-- `auth.users.phone` is deliberately NOT set: it is the SMS/OTP identity field,
-- is uniquely constrained and expects a confirmation flow, so writing
-- unverified numbers there could break account creation on duplicates.
-- =====================================================================

-- --- 1. Trigger: carry `phone` from signup metadata into the profile. --------
-- Unchanged from 0017 except for the phone column: promote-intake now passes
-- `phone` in user_metadata alongside `full_name`. Blank strings normalise to
-- null so an omitted phone stays null rather than ''.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role text := coalesce(new.raw_user_meta_data->>'role', 'client');
begin
  -- only client/event_planner can self-register; vendors go through application
  if v_role not in ('client','event_planner') then v_role := 'client'; end if;

  insert into public.profiles(id, full_name, email, phone, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
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

-- --- 2. Backfill profiles whose phone was dropped on promotion. --------------
-- Matches on email (citext on both sides, so case-insensitive). An applicant
-- may have submitted more than one intake, so take the most recent one that
-- actually carries a phone. Only fills where the profile has no phone yet:
-- never clobbers a number the user maintains, and makes this safe to re-run.
update public.profiles p
set phone = latest.owner_phone
from (
  select distinct on (owner_email)
         owner_email,
         btrim(owner_phone) as owner_phone,
         created_at
  from public.vendor_application_intake
  where nullif(btrim(coalesce(owner_phone,'')), '') is not null
  order by owner_email, created_at desc
) latest
where p.email = latest.owner_email
  and p.phone is null
  and p.deleted_at is null;
