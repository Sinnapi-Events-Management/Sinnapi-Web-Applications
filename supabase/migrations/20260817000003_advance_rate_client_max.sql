-- =====================================================================
-- Sinnapi — 0817c THE CLIENT'S ADVANCE CAP IS 50%, AND SAYS SO
--
-- THE SYMPTOM
-- A client typing 50 into the advance field is refused with:
--
--   "Sinnapi releases at most 30% of a booking before the event."
--
-- 30 is the wrong number, and there are two independent ways it gets there.
-- This file closes both, and is safe to run whether or not 0817b landed.
--
-- ROUTE ONE — the ceiling function (fixed in 0817b, re-asserted here)
-- `advance_rate_ceiling` took `advance_rate_default` — the figure a new
-- quotation is *pre-filled* with — and returned it as a maximum whenever the
-- vendor had proposed nothing. A suggestion used as a limit.
--
-- ROUTE TWO — the setting's own description
-- `advance_rate_max` was seeded (0809a) described as:
--
--   'Ceiling a vendor may propose as an advance. Enforced in the DB, not just
--    the UI.'
--
-- It is edited through the console's generic platform-settings editor, which
-- shows an admin exactly that sentence. An admin who wants vendors to stop
-- asking for large advances therefore lowers it to 30 — and silently caps every
-- *client* at 30 as well, because the same setting bounds both sides. Nothing
-- on that screen says so. That is a trap in the copy, not a mistake by the
-- admin, so the description is rewritten rather than the admin corrected.
--
-- WHAT THE RULE ACTUALLY IS
--   advance_rate_default   the figure the client's field starts on. A
--                          suggestion. The client may override it in either
--                          direction.
--   advance_rate_max       the most that may ever leave escrow before an event,
--                          whoever asked for it — vendor proposal or client
--                          choice. The product's stated figure is 50%.
--
-- One setting for the platform's exposure is right: the risk is the same money
-- leaving early regardless of which party named the number. What was wrong was
-- that the *other* setting was standing in for it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The ceiling. Identical to 0817b — repeated so this file is self-sufficient
-- for a database that has 0817a but not 0817b, and harmless where 0817b ran.
-- ---------------------------------------------------------------------
create or replace function public.advance_rate_ceiling(p_proposed numeric)
returns numeric language sql stable security definer set search_path = public as $$
  -- `p_proposed` is deliberately unused: a vendor's proposal is a starting
  -- value, not a limit. See 0817b.
  select coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
$$;

comment on function public.advance_rate_ceiling(numeric) is
  'The most a client may release before an event: platform_settings.advance_rate_max. The '
  'argument is ignored — a vendor''s proposed rate is the starting value, not the ceiling.';

-- ---------------------------------------------------------------------
-- Say what the setting actually governs.
--
-- The old wording named only vendors, which is what made lowering it look
-- free of consequences for clients. An admin reading the new sentence and
-- still choosing 30 is making an informed decision, which is the point.
-- ---------------------------------------------------------------------
update public.platform_settings
   set description =
         'The most of a booking that may be released before the event, as a percentage — the '
         'cap for BOTH a vendor''s proposed advance and a client''s own choice at checkout. '
         'Lowering this restricts clients as well as vendors. The figure a new quotation starts '
         'from is advance_rate_default, which is a suggestion and is not a limit.'
 where key = 'advance_rate_max';

update public.platform_settings
   set description =
         'The advance percentage a new quotation is pre-filled with, and the figure a client''s '
         'advance field starts on. A suggestion only — the client may choose more or less, up to '
         'advance_rate_max. This is NOT a ceiling.'
 where key = 'advance_rate_default';

-- ---------------------------------------------------------------------
-- Restore the product's stated maximum.
--
-- 0809a seeded 50 with `on conflict (key) do nothing`, so a database that
-- already carried this key kept whatever it had; and any admin who lowered it
-- did so on the strength of a description that only mentioned vendors. Both
-- paths leave a value that caps clients in a way nobody chose deliberately.
--
-- Raised, never lowered: an admin who has deliberately set a *higher* ceiling
-- has made a decision about the platform's own exposure, and this migration is
-- not the place to reverse it. Missing rows are inserted so the setting exists
-- to be edited at all.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description)
values ('advance_rate_max', '50'::jsonb, 'number',
        'The most of a booking that may be released before the event, as a percentage — the '
        'cap for BOTH a vendor''s proposed advance and a client''s own choice at checkout.')
on conflict (key) do update
   set value = '50'::jsonb
 where (public.platform_settings.value #>> '{}')::numeric < 50;
