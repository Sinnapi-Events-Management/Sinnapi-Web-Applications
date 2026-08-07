-- =====================================================================
-- Sinnapi — 0807b Reference token: 5 digits + 3 letters, shuffled
--
-- Supersedes the Crockford Base32 token introduced hours earlier in
-- 20260807000001. That migration's reasoning about *where* a reference
-- is assigned (the BEFORE INSERT trigger on each table, not the RPC) and
-- *why* it is retried (the unique index adjudicates, the loop redraws)
-- still stands untouched — this migration changes only the shape of the
-- eight characters the token is made of.
--
-- WHAT CHANGES
--   before:  Q-H3Q1FQSP   8 characters, any mix, from one 32-symbol set
--   after:   Q-7657H8YH   8 characters, exactly 5 digits and 3 letters,
--                         in positions that vary from one reference to
--                         the next
--
-- The prefix is unchanged: `Q` for a quotation, `B` for a booking, so
-- support still tells the two apart on sight and the two tables'
-- independent unique indexes can never hold the same string.
--
-- WHY THE MIX IS SHUFFLED RATHER THAN GROUPED
-- `Q-76578HYH` (digits then letters) and `Q-7657H8YH` (interleaved) hold
-- the same 5 digits and 3 letters. The difference is that fixing the
-- positions makes them free information: an attacker enumerating
-- references need only walk 10^5 x 22^3 = 1.06e9 strings, whereas
-- randomising which three of the eight slots hold letters multiplies the
-- space by C(8,3) = 56.
--
-- KEYSPACE, STATED PLAINLY
--   10^5 x 22^3 x C(8,3) = 5.96e10, i.e. ~35.8 bits.
--
-- That is ~4 bits below the 40 the Base32 token carried, and the honest
-- reading is that this is a legibility choice paid for in entropy, not a
-- free one. It remains an acceptable trade for three reasons, in order:
--
--   1. A reference is a display identifier, never a credential. It is
--      not accepted as proof of anything: every read path in the four
--      portals reaches rows through RLS on `auth.uid()`, and no RPC,
--      no policy and no PSP integration takes a reference as input.
--      Guessing one buys an attacker a string, not a row.
--   2. Insert safety does not rest on the keyspace at all. It rests on
--      the retry loops in `request_quotation` / `create_booking`, which
--      let the unique index reject a duplicate and simply draw again.
--      Those loops are unchanged and are not weakened by a smaller
--      alphabet; at 5.96e10 a single retry remains vanishingly rare.
--   3. The date-leak that motivated 20260807000001 is not reintroduced.
--      Nothing in the token discloses when the row was created.
--
-- WHY 22 LETTERS AND NOT 26
-- I, L, O and U are excluded, as in Crockford Base32. References are
-- read off a PDF, dictated over the phone and re-typed into a support
-- form; `I` against `1` and `O` against `0` are exactly the confusions
-- that turn a support call into two support calls, and dropping `U`
-- keeps the generator from ever spelling an obscenity. The four letters
-- cost 0.75 bits between them, which is the cheapest part of this whole
-- trade.
--
-- SCOPE — DELIBERATELY NOT BACKFILLED
-- Unchanged from 20260807000001, and now doubly true: three formats
-- coexist in `reference_no` (the original `QT-20260806-139D1C`, the
-- Base32 `Q-H3Q1FQSP`, and this one). That is safe because nothing on
-- the platform parses a reference. Verified across the whole codebase:
-- no CHECK constraint on the column, no LIKE or ILIKE against it in any
-- RPC or admin search, no regex, no length assumption, and every
-- frontend use in all four portals is display-only — table cells, page
-- titles, and the quotation PDF header. Existing references stay valid
-- and the paper trail clients already hold stays intact.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Signature change, and why the drop comes first.
--
-- The old `gen_reference_token(p_length int)` was a generic
-- variable-length generator, and `p_length` has no meaning for a shape
-- fixed at 5 digits and 3 letters. The replacement takes no arguments.
--
-- The two cannot coexist even briefly. 20260807000001 declared the
-- parameter as `p_length int default 8`, which makes that function
-- callable with zero arguments — so while both exist, `gen_reference`'s
-- call to `public.gen_reference_token()` matches both candidates and
-- fails to resolve. It fails at CREATE time, not at run time: a
-- `language sql` body is parsed and its calls resolved when the function
-- is created (`check_function_bodies` is on by default), so redefining
-- `gen_reference` ahead of this drop would abort the whole migration.
--
-- Dropping first is safe because the existing `gen_reference` has a
-- quoted body and therefore records no dependency on the callee, and
-- because a migration runs in one transaction — nothing outside it ever
-- observes the moment where the token function is missing.
-- ---------------------------------------------------------------------
drop function if exists public.gen_reference_token(int);

-- ---------------------------------------------------------------------
-- The token.
--
-- RANDOMNESS. `gen_random_bytes` is pgcrypto's CSPRNG, used rather than
-- `random()` for the same reason as before: `random()` is a seeded PRNG
-- whose future output is derivable from output already observed, which
-- is the one property a reference generator must not have.
--
-- MODULO BIAS. The previous token could take `byte % 32` directly
-- because 256 is an exact multiple of 32. Neither 10 nor 22 divides 256,
-- so a bare `% 10` would make 0..5 measurably likelier than 6..9. Every
-- draw here therefore rejects the top partial block — bytes at or above
-- `256 - (256 % bound)` are discarded and redrawn — which is uniform by
-- construction for any bound. The same rejection covers the shuffle's
-- descending bounds (8, 7, 6 ... 2), where the bias would otherwise be
-- worst: `% 7` over a byte favours the low indices by ~17%, and a biased
-- shuffle would leak positional structure back into the token, undoing
-- the whole point of shuffling it.
--
-- The bounds are collected first and drawn in one pass so that the
-- rejection-sampling loop is written once rather than three times.
-- Bytes come from a 64-byte pool refilled on exhaustion, so the common
-- case is a single call into the CSPRNG for all fifteen draws rather
-- than fifteen calls.
--
-- UNIFORMITY OF THE RESULT. Each character is uniform over its own
-- alphabet and the Fisher-Yates pass is uniform over the 8! orderings,
-- so every string with exactly 5 digits and 3 letters is produced with
-- equal probability. Repeated characters (the two `H`s in `Q-7657H8YH`)
-- are permitted and do not skew this: each distinct output string is
-- reachable by the same number of (draw, permutation) pairs.
--
-- `search_path` includes `extensions` because pgcrypto's home schema
-- differs between a Supabase project that enabled it from the Dashboard
-- (`extensions`) and one where 0001's bare `create extension` placed it
-- (`public`). Listing both resolves either; a schema in `search_path`
-- that does not exist is ignored, so this is safe on both.
-- ---------------------------------------------------------------------
create or replace function public.gen_reference_token()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  c_digits       constant text := '0123456789';
  -- A-Z less I, L, O, U — 22 letters.
  c_letters      constant text := 'ABCDEFGHJKMNPQRSTVWXYZ';
  c_digit_count  constant int  := 5;
  c_letter_count constant int  := 3;
  c_len          constant int  := c_digit_count + c_letter_count;
  c_pool_len     constant int  := 64;

  v_bounds int[];
  v_picks  int[] := array[]::int[];
  v_slots  text[];

  v_pool   bytea;
  v_cursor int := 0;   -- offset of the next unread byte in v_pool
  v_bound  int;
  v_limit  int;
  v_byte   int;

  -- `i` is left to the FOR loops' implicit declaration; declaring it here
  -- as well would only shadow it.
  j        int;
  v_next   int;        -- cursor into the shuffle half of v_picks
  v_swap   text;
begin
  -- One bound per random value needed: the eight characters, then the
  -- seven Fisher-Yates swap targets.
  v_bounds := array_fill(length(c_digits),  array[c_digit_count])
           || array_fill(length(c_letters), array[c_letter_count]);
  for i in reverse c_len .. 2 loop
    v_bounds := v_bounds || i;
  end loop;

  v_pool := gen_random_bytes(c_pool_len);

  for i in 1 .. array_length(v_bounds, 1) loop
    v_bound := v_bounds[i];
    v_limit := 256 - (256 % v_bound);   -- largest exact multiple of v_bound
    loop
      if v_cursor >= c_pool_len then
        v_pool   := gen_random_bytes(c_pool_len);
        v_cursor := 0;
      end if;
      v_byte   := get_byte(v_pool, v_cursor);
      v_cursor := v_cursor + 1;
      exit when v_byte < v_limit;       -- else discard and redraw: no bias
    end loop;
    v_picks := v_picks || (v_byte % v_bound);
  end loop;

  -- Characters in canonical order: digits first, then letters.
  v_slots := array_fill(null::text, array[c_len]);
  for i in 1 .. c_digit_count loop
    v_slots[i] := substr(c_digits, v_picks[i] + 1, 1);
  end loop;
  for i in 1 .. c_letter_count loop
    v_slots[c_digit_count + i] := substr(c_letters, v_picks[c_digit_count + i] + 1, 1);
  end loop;

  -- Fisher-Yates: scatter the three letters across the eight positions.
  v_next := c_len;
  for i in reverse c_len .. 2 loop
    v_next := v_next + 1;
    j      := v_picks[v_next] + 1;      -- uniform in 1 .. i
    if j <> i then
      v_swap     := v_slots[i];
      v_slots[i] := v_slots[j];
      v_slots[j] := v_swap;
    end if;
  end loop;

  return array_to_string(v_slots, '');
end;
$$;

comment on function public.gen_reference_token() is
  'Cryptographically random 8-character token: exactly 5 digits and 3 letters (A-Z less I/L/O/U) in shuffled positions, e.g. 7657H8YH. ~35.8 bits.';

-- ---------------------------------------------------------------------
-- Public-facing reference. Signature and behaviour are unchanged from
-- 20260807000001 — same prefix handling, same hyphen — so the triggers
-- on `quotations` and `bookings` and both RPCs keep working untouched.
-- Only the callee it delegates to has changed.
-- ---------------------------------------------------------------------
create or replace function public.gen_reference(p_prefix text)
returns text
language sql
volatile
set search_path = public
as $$
  select case
           when p_prefix is null or p_prefix = '' then public.gen_reference_token()
           else upper(p_prefix) || '-' || public.gen_reference_token()
         end;
$$;

comment on function public.gen_reference(text) is
  'Human-quotable record reference: <PREFIX>-<5 digits and 3 letters, shuffled>, e.g. Q-7657H8YH.';

-- Internal helpers: never called from a client, and a caller able to
-- mint references at will is a nuisance the platform has no reason to
-- allow. The triggers and RPCs are SECURITY DEFINER, so they reach these
-- as the function owner regardless. (`public` is the PUBLIC pseudo-role
-- and covers every role without an explicit grant; `authenticated` is
-- named separately because 0014's blanket `grant execute on all
-- functions` gave it one, and because a fresh CREATE FUNCTION grants
-- EXECUTE to PUBLIC by default — this revoke is what takes it back.)
revoke execute on function public.gen_reference_token()   from public, authenticated;
revoke execute on function public.gen_reference(text)     from public, authenticated;
