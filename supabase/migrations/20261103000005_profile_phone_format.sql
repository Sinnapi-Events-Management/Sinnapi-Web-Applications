-- =====================================================================
-- Sinnapi — 1103e A phone a PERSON types must be international (E.164).
--
-- Every portal's phone input now produces E.164 (`+256772123456`) through
-- the shared `PhoneField`. This is the same rule on the server, so a stale
-- tab, an old app build or a hand-made API call cannot store a number
-- WhatsApp cannot reach.
--
-- WHO IT APPLIES TO
-- Writes made by a signed-in person (`auth.uid()` set): their own profile
-- edits, and an operator editing someone else's. NOT system writes
-- (service role / triggers, `auth.uid()` null): the vendor-approval copy of
-- an applicant's phone and the legacy import must keep working with the
-- numbers they were given. Those owners are asked to fix their number at
-- login instead — the product decision is to ask, never to guess a country.
--
-- It also tidies: spaces, dashes, dots and brackets are removed, and a
-- blank becomes null, so what is stored is exactly `phone_e164`.
-- =====================================================================

create or replace function public.tg_profiles_phone_format()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' and new.phone is not distinct from old.phone then return new; end if;

  if new.phone is null or btrim(new.phone) = '' then
    new.phone := null;
    return new;
  end if;

  new.phone := regexp_replace(new.phone, '[\s().\-]', '', 'g');
  if new.phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using
      errcode = '22023',
      message = 'Enter the phone number with its country code, for example +256772123456.';
  end if;
  return new;
end;$$;

drop trigger if exists trg_profiles_phone_format on public.profiles;
create trigger trg_profiles_phone_format
  before insert or update of phone on public.profiles
  for each row execute function public.tg_profiles_phone_format();

comment on function public.tg_profiles_phone_format() is
  'Signed-in writes to profiles.phone must be E.164 (normalised, blank -> null). System writes '
  '(auth.uid() null) are exempt so approvals/imports of legacy numbers keep working.';
