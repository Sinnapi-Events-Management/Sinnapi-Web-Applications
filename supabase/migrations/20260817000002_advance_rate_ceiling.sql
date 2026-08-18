-- =====================================================================
-- Sinnapi — 0817b THE ADVANCE CEILING IS THE PLATFORM MAXIMUM
--
-- WHAT WAS WRONG
-- `advance_rate_ceiling` (0811.1) conflated two settings that mean opposite
-- things:
--
--   select least(
--     coalesce(p_proposed, advance_rate_default, 0),   -- a STARTING value
--     advance_rate_max);                               -- the real ceiling
--
-- `advance_rate_default` is the figure a new quotation is pre-filled with — a
-- suggestion, and an admin-tunable one. `advance_rate_max` is the most the
-- platform will ever release before an event. The function took the first and
-- used it as the second.
--
-- The consequence, on every booking where the vendor proposed no advance terms
-- — which is every booking made from a vendor's profile or from the bookings
-- page, since neither path involves a quotation — was a client capped at 30%
-- by a setting that exists to say "start at 30%". The slider stopped there, and
-- the field's refusal read:
--
--   "Cannot exceed the 30% your vendor proposed."
--
-- naming a vendor who had proposed nothing at all, about a number that came
-- from the admin console. Two false statements in one sentence, on a screen
-- where the client is being asked to consent to money leaving their account
-- before they receive anything.
--
-- WHAT IT IS NOW
-- The ceiling is `advance_rate_max`, always. That is the only setting that
-- expresses an upper bound, and it is already the bound the vendor's own quote
-- form enforces (`ADVANCE_RATE_MAX` in the vendor portal, 50).
--
-- The vendor's proposal keeps its real job — it is the *starting value*, and
-- every caller already resolves that separately and correctly:
--
--   escrow_price_booking   coalesce(p_advance_rate, b.advance_rate, default)
--   payment_terms_preview  coalesce(p_advance_rate, p_proposed_rate, default)
--   accept_advance_terms   coalesce(p_advance_rate, b.advance_rate, default)
--
-- so nothing else in the schema has to change. This one function was carrying
-- the whole fault.
--
-- WHAT THIS CHANGES ABOUT THE DEAL
-- A client may now choose an advance *above* what their vendor proposed, up to
-- the platform maximum. 0811.1 deliberately forbade that ("only downward"), on
-- the grounds that the quotation's written terms should never be exceeded.
--
-- The direction matters, though: a larger advance means the vendor is paid
-- *more* of their fee *earlier*, which no vendor needs protecting from. The
-- party taking on the extra risk is the client, and the client is the one
-- choosing it — on a screen that states plainly what leaves escrow before the
-- event. `advance_rate_max` remains the platform's own limit on that exposure,
-- and `accept_advance_terms` still writes an `advance_rate_chosen_by_client`
-- audit row whenever the figure differs from the vendor's.
--
-- The parameter is kept rather than dropped. plpgsql resolves function calls at
-- runtime, so removing it would break six existing function bodies until every
-- one of them was recreated — a large migration for a cosmetic gain. It is
-- ignored, and documented as ignored.
-- =====================================================================
create or replace function public.advance_rate_ceiling(p_proposed numeric)
returns numeric language sql stable security definer set search_path = public as $$
  -- `p_proposed` is deliberately unused: a vendor's proposal is a starting
  -- value, not a limit. See this file's header.
  select coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
$$;

comment on function public.advance_rate_ceiling(numeric) is
  'The most a client may release before an event: platform_settings.advance_rate_max. The '
  'argument is ignored — a vendor''s proposed rate is the starting value, not the ceiling.';
