-- =====================================================================
-- Sinnapi — 0807 Quotation / booking reference-number generation
-- Replaces the date-stamped hex reference (`QT-20260806-139D1C`) with a
-- short, opaque, collision-safe token (`Q-7K3M9X4B`).
--
-- WHAT WAS WRONG WITH THE OLD SCHEME
-- `gen_reference` (0014) produced `PREFIX-YYYYMMDD-<6 hex chars>`:
--
--   select p_prefix || '-' || to_char(now(),'YYYYMMDD') || '-' ||
--          upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
--
-- Three problems, in order of how much they actually matter:
--
-- 1. THE DATE SEGMENT LEAKS AND NARROWS. It discloses the creation date of
--    every quotation and booking to anyone who sees a reference, and it
--    reduces a guess to the ~16.7M values issued on one known day rather
--    than the whole keyspace. The date, not the `QT`, is the weakness — a
--    constant prefix costs nothing, because only entropy resists guessing.
--
-- 2. ONLY 24 BITS OF ENTROPY, AND HEX AT THAT. Six hex characters spend
--    eight visible glyphs on an alphabet of sixteen. The same eight
--    characters over a 32-symbol alphabet carry 40 bits.
--
-- 3. NO COLLISION HANDLING ANYWHERE. `ux_quotations_ref` and
--    `ux_bookings_ref` (0006) are unique, so a duplicate raised a bare
--    23505 out of `request_quotation` / `create_booking` and aborted the
--    caller's transaction — the client lost the whole request over a
--    dice roll. Tolerable while the random part was per-day scoped; not
--    tolerable for a token drawn from one global keyspace forever. This
--    migration is what makes the shortening safe: the retry below, not
--    the size of the keyspace, is what guarantees an insert succeeds.
--
-- WHAT REPLACES IT
-- `<PREFIX>-<8 chars of Crockford Base32>`, e.g. `Q-7K3M9X4B` for a
-- quotation and `B-4B8ZTNQ2` for a booking.
--
--   * Crockford Base32 — `0123456789ABCDEFGHJKMNPQRSTVWXYZ` — drops I, L,
--     O and U. Nothing in a reference can be confused with 1, 0 or the
--     obscenity U completes, which matters because these are read off a
--     PDF, dictated over a phone and re-typed into a support form.
--   * 32^8 = 1.1e12 (40 bits) versus 1.6e7 usable before, and no
--     positional pattern: every character is drawn from the same
--     alphabet, so the string carries no shape to recognise.
--   * The one-character prefix is kept deliberately. It is not a secret
--     and is not pretending to be one — it exists so support can tell a
--     quotation reference from a booking reference on sight, and so the
--     two tables' independent unique indexes can never both hold the
--     same string.
--
-- and it is assigned by a BEFORE INSERT trigger on each table rather
-- than by the RPCs, because RLS admits direct client inserts that would
-- otherwise choose their own reference. See the trigger section below.
--
-- SCOPE — DELIBERATELY NOT BACKFILLED
-- Existing rows keep their old references. Clients and vendors already
-- hold PDFs, emails and screenshots quoting them; rewriting history to
-- tidy the format would break that paper trail for no security gain,
-- since these references are display identifiers, not credentials. The
-- two formats coexist: `reference_no` stays plain `text` with no format
-- CHECK, and nothing in the platform parses a reference — it is never a
-- lookup key, never searched with LIKE, and never sent to a payment
-- provider (PSPs are handed payment/payout UUIDs).
-- =====================================================================

-- ---------------------------------------------------------------------
-- The token itself.
--
-- `gen_random_bytes` is pgcrypto's CSPRNG. It is used rather than
-- `random()` on purpose: `random()` is a seeded PRNG whose stream is
-- predictable from observed output, which is precisely the property this
-- migration exists to remove.
--
-- `% 32` introduces no modulo bias — a byte spans 0..255 and 256 is an
-- exact multiple of 32, so all 32 symbols are equally likely.
--
-- `search_path` includes `extensions` because pgcrypto's home schema
-- differs between a Supabase project that enabled it from the Dashboard
-- (`extensions`) and one where 0001's bare `create extension` placed it
-- (`public`). Listing both resolves either; a schema in `search_path`
-- that does not exist is ignored, so this is safe on both.
-- ---------------------------------------------------------------------
create or replace function public.gen_reference_token(p_length int default 8)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  -- Crockford Base32: digits + A-Z less I, L, O, U.
  c_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes    bytea;
  v_out      text := '';
  i          int;
begin
  if p_length is null or p_length < 1 then
    raise exception 'gen_reference_token: p_length must be >= 1' using errcode = '22023';
  end if;

  v_bytes := gen_random_bytes(p_length);

  for i in 0 .. p_length - 1 loop
    v_out := v_out || substr(c_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
  end loop;

  return v_out;
end;
$$;

comment on function public.gen_reference_token(int) is
  'Cryptographically random Crockford Base32 token (no I/L/O/U). 5 bits per character.';

-- ---------------------------------------------------------------------
-- Public-facing reference. Signature is unchanged from 0014 so every
-- existing caller keeps working; only the produced shape changes.
-- ---------------------------------------------------------------------
create or replace function public.gen_reference(p_prefix text)
returns text
language sql
volatile
set search_path = public
as $$
  select case
           when p_prefix is null or p_prefix = '' then public.gen_reference_token(8)
           else upper(p_prefix) || '-' || public.gen_reference_token(8)
         end;
$$;

comment on function public.gen_reference(text) is
  'Human-quotable record reference: <PREFIX>-<8 Crockford Base32 chars>, e.g. Q-7K3M9X4B.';

-- Internal helpers: never called from a client, and a caller able to mint
-- references at will is a nuisance the platform has no reason to allow.
-- The RPCs and the trigger below are SECURITY DEFINER, so they still reach
-- these as the function owner regardless of what `authenticated` may
-- execute. (`public` is the PUBLIC pseudo-role and covers every role
-- without an explicit grant; `authenticated` is named separately because
-- 0014's blanket `grant execute on all functions` gave it one.)
revoke execute on function public.gen_reference_token(int) from public, authenticated;
revoke execute on function public.gen_reference(text)      from public, authenticated;

-- =====================================================================
-- THE REFERENCE IS ASSIGNED BY THE TABLE, NOT BY THE CALLER
--
-- Generating an unguessable token in `request_quotation` only makes
-- references unguessable for rows that happen to arrive through
-- `request_quotation`. They do not have to. `quotations_insert` and
-- `bookings_insert` (0011) admit any authenticated client whose row
-- carries `client_id = auth.uid()`, and because `reference_no` is NOT
-- NULL with no default, such an insert does not merely skip the
-- generator — it is *obliged* to supply a reference of its own choosing.
-- `quotations_update` / `bookings_update` then let the client or the
-- vendor rewrite it afterwards.
--
-- So the property being bought here — that a reference cannot be
-- predicted, chosen, squatted or altered — is a property of the table,
-- and it is enforced where the row is written rather than where one
-- particular caller is polite enough to ask. The trigger overwrites
-- whatever was supplied on INSERT and rejects any change on UPDATE.
--
-- Nothing on the platform legitimately supplies its own reference (the
-- two RPCs below are the only writers, and they now omit the column
-- entirely), so nothing is broken by ignoring the supplied value. A
-- BEFORE trigger runs ahead of constraint evaluation, which is why the
-- column can be omitted from an INSERT despite being NOT NULL.
--
-- `update of reference_no` narrows the UPDATE trigger to statements that
-- actually name the column, so the ordinary status/total updates that
-- run on these tables constantly pay nothing for the guard.
-- =====================================================================
create or replace function public.tg_assign_reference_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.reference_no := public.gen_reference(tg_argv[0]);
    return new;
  end if;

  if new.reference_no is distinct from old.reference_no then
    raise exception 'reference_no is immutable (% -> %)', old.reference_no, new.reference_no
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.tg_assign_reference_no() is
  'BEFORE INSERT: assigns reference_no from gen_reference(TG_ARGV[0]), ignoring any supplied value. BEFORE UPDATE OF reference_no: rejects changes.';

drop trigger if exists trg_reference_no on public.quotations;
create trigger trg_reference_no
  before insert or update of reference_no on public.quotations
  for each row execute function public.tg_assign_reference_no('Q');

drop trigger if exists trg_reference_no on public.bookings;
create trigger trg_reference_no
  before insert or update of reference_no on public.bookings
  for each row execute function public.tg_assign_reference_no('B');

-- =====================================================================
-- CALLERS — insert with retry
--
-- Both RPCs now omit `reference_no` from the column list — the trigger
-- above owns it. Re-attempting the INSERT is therefore all that a retry
-- needs to do: each attempt re-fires the trigger and draws a fresh token.
--
-- The retry wraps the INSERT rather than pre-checking the table for a
-- free reference. A `select … where not exists` followed by an insert
-- races: two sessions can both find the same candidate unused and both
-- proceed, and the loser still gets a 23505. Letting the unique index
-- adjudicate and catching its violation is the only formulation with no
-- window between the check and the write.
--
-- Only a violation of the reference index is retried. Any other unique
-- violation is a real conflict and is re-raised untouched, so this never
-- swallows a bug by silently looping over it.
--
-- Eight attempts is far past generous: at 40 bits, a single retry is
-- already improbable to the point of being untestable, and the loop
-- exists for correctness under concurrency rather than for volume.
-- Exhausting it means something is structurally wrong (an exhausted
-- keyspace, a broken CSPRNG), so it raises rather than returning a
-- degraded reference.
-- =====================================================================

create or replace function public.request_quotation(
  p_vendor_id uuid, p_details text, p_event_id uuid default null, p_currency text default 'UGX')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  for i in 1 .. 8 loop
    begin
      insert into public.quotations(vendor_id, client_id, event_id, status, currency, request_details)
      values (p_vendor_id, auth.uid(), p_event_id, 'requested', p_currency, p_details)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: quotations' using errcode = '23505';
end;$$;

create or replace function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = p_vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable'; end if;

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, location, currency, amount)
      values (p_vendor_id, auth.uid(), p_service_id, p_quotation_id, p_event_id,
          'requested', p_event_date, p_location, p_currency, p_amount)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_bookings_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: bookings' using errcode = '23505';
end;$$;
