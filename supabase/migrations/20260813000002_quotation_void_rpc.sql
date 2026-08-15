-- =====================================================================
-- Sinnapi — 0813b Quotations: voiding, and the guards that make it hold
--
-- WHAT THIS FILE PROVIDES
--   * tg_quotation_history   now records a per-transition reason
--   * void_quotation         either party withdraws an unanswered quotation
--   * respond_quotation      hardened: it had no source-status guard at all
--
-- WHO MAY VOID, AND FROM WHERE
-- Either party acting alone, because a withdrawal is one side's decision by
-- definition — a client whose event is off does not need the vendor's
-- agreement to stop asking for a price, and a vendor who cannot honour a
-- number should not be made to wait for a reply that settles it.
--
-- The two sides start from different places, so they void from different
-- states:
--
--   client  requested, sent, revised   every state where the client is either
--                                      waiting on a price or holding a live
--                                      offer they have not answered
--   vendor  draft, sent, revised       a vendor's own work in progress, plus
--                                      an offer they have made. Never
--                                      `requested`: that is the client's ask
--                                      sitting in the vendor's queue, and a
--                                      vendor who does not want it declines
--                                      by letting it lapse or by quoting.
--
-- Neither may void `accepted`, `declined`, `expired` or `voided`. Those are
-- settled, and three of them are settled *by the other party* — reaching back
-- through a decision someone else made is not a withdrawal, it is a reversal.
--
-- `accepted` is the one worth spelling out. Accepting a quote is what copies
-- its advance terms onto the booking (see respond_quotation below), and a
-- booking may by then be funded into escrow. Voiding the quote underneath it
-- would leave money held against terms the record now says were withdrawn.
-- Backing out of an accepted quote is a booking cancellation — it has its own
-- RPC, its own refund path and its own audit trail, and it belongs there.
--
-- WHY A REASON IS REQUIRED
-- Every void is visible to the other party, who is left holding either an
-- unanswered request or an offer they spent time building. "Withdrawn" with no
-- sentence attached is the version of this that generates a support thread.
-- The reason is stored on the history row and sent in the notification.
-- =====================================================================

-- ---------------------------------------------------------------------
-- tg_quotation_history — now carries a reason.
--
-- The trigger wrote (from, to, actor) and nothing else, so the quotation trail
-- could say a quote became `declined` but never why. `quotations` has no
-- column to source one from either — unlike bookings, which had
-- `cancellation_reason` to lean on.
--
-- A transaction-local GUC carries it, exactly as tg_booking_history does since
-- 0812a: the caller sets it immediately before the update and clears it
-- immediately after, so it applies to one transition and cannot leak into a
-- second one in the same transaction. `set_config(..., true)` is rolled back
-- with the transaction, so a failed RPC leaves nothing behind either.
-- ---------------------------------------------------------------------
create or replace function public.tg_quotation_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_reason text;
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    v_reason := nullif(current_setting('sinnapi.status_reason', true), '');
    insert into public.quotation_status_history(
      quotation_id, from_status, to_status, actor_id, reason)
    values (new.id,
            case when tg_op = 'UPDATE' then old.status end,
            new.status,
            auth.uid(),
            v_reason);
  end if;
  return new;
end;$$;

-- ---------------------------------------------------------------------
-- void_quotation — either party withdraws an unanswered quotation.
--
-- Idempotent on the target state: two people looking at the same quote and
-- both deciding it is off is the expected case, not an error, and the second
-- call should not raise at someone who did nothing wrong. It returns quietly
-- rather than writing a second history row for a status that did not change.
-- ---------------------------------------------------------------------
create or replace function public.void_quotation(
  p_quotation_id uuid,
  p_reason       text)
returns void language plpgsql security definer set search_path = public as $$
declare
  q          public.quotations;
  v_is_client boolean;
  v_is_vendor boolean;
  v_owner     uuid;
  v_reason    text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into q from public.quotations where id = p_quotation_id and deleted_at is null;
  if q.id is null then raise exception 'not_found'; end if;

  v_is_client := q.client_id = auth.uid();
  v_is_vendor := public.is_vendor_owner(q.vendor_id);
  if not (v_is_client or v_is_vendor) then perform public._forbidden(); end if;

  -- Already withdrawn. Nothing to do, and nothing to complain about.
  if q.status = 'voided' then return; end if;

  -- The state gate, per side. Checked before the reason so that someone acting
  -- on a quote that has already been settled is told *that*, rather than being
  -- asked to justify a move they were never going to be allowed to make.
  if v_is_client and q.status in ('requested', 'sent', 'revised') then
    null;
  elsif v_is_vendor and q.status in ('draft', 'sent', 'revised') then
    null;
  else
    raise exception 'quotation_not_voidable';
  end if;

  if v_reason is null then raise exception 'reason_required'; end if;
  if length(v_reason) > 500 then raise exception 'reason_too_long'; end if;

  perform set_config('sinnapi.status_reason', v_reason, true);
  update public.quotations
     set status     = 'voided',
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_quotation_id;
  perform set_config('sinnapi.status_reason', '', true);

  -- `responded_at` is deliberately left alone. It means "the client answered
  -- the offer", and a withdrawal by either side is not an answer to it — the
  -- history row is the record of what happened and when.

  -- Tell the side that did not do it. The one who acted already knows, and a
  -- notification about your own click is noise in an inbox that is also
  -- carrying booking and escrow events.
  select owner_id into v_owner from public.vendors where id = q.vendor_id;

  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select
    case when v_is_client then v_owner else q.client_id end,
    'quotation.voided',
    coalesce('Quotation ' || q.reference_no || ' was withdrawn', 'A quotation was withdrawn'),
    case when v_is_client
         then 'The client has withdrawn this quote request. Reason: ' || v_reason
         else 'The vendor has withdrawn this quote. Reason: ' || v_reason
    end,
    jsonb_build_object(
      'quotation_id',  q.id,
      'reference_no',  q.reference_no,
      'vendor_id',     q.vendor_id,
      'client_id',     q.client_id,
      'voided_by',     case when v_is_client then 'client' else 'vendor' end,
      'reason',        v_reason)
  -- A vendor row with no owner cannot be notified; the void still stands.
  where (case when v_is_client then v_owner else q.client_id end) is not null;
end;$$;

-- ---------------------------------------------------------------------
-- respond_quotation — hardened.
--
-- The body below is unchanged from 0809c in what it does on a valid call. Two
-- things it never did are added:
--
--   the action is validated   an unrecognised `p_action` fell through the CASE
--                             to `else status`, left the row untouched, and
--                             still stamped `responded_at` — so a typo'd call
--                             reported success and marked the quote answered
--                             when nothing had been answered.
--
--   the source state is gated  there was no `from` check of any kind. A client
--                             could accept a quote they had already declined,
--                             accept one whose `valid_until` had passed, or
--                             re-answer an accepted quote and re-copy its terms
--                             onto the booking. With `voided` now reachable,
--                             the same hole would let an Accept resurrect a
--                             quotation the vendor had explicitly withdrawn —
--                             which is the case that makes this a correctness
--                             fix rather than a tidy-up.
--
-- `expired` is enforced against `valid_until` rather than against the status,
-- because nothing in the schema moves a quote to `expired` when its date
-- passes — the column is the only truth about whether an offer is still live.
--
-- The optional reason is new, and it is what makes "Request changes" a usable
-- control rather than a bare status flip: a vendor told their quote was sent
-- back with no note has nothing to act on. It rides the same GUC the void does,
-- so decline and revise both land a sentence on the history row.
-- ---------------------------------------------------------------------
create or replace function public.respond_quotation(
  p_quotation_id uuid,
  p_action       text,
  p_reason       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q        public.quotations;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_action not in ('accept', 'decline', 'revise') then
    raise exception 'invalid_action';
  end if;
  if length(coalesce(v_reason, '')) > 500 then raise exception 'reason_too_long'; end if;

  select * into q from public.quotations where id = p_quotation_id and deleted_at is null;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  -- A client answers an offer. `requested` and `draft` are not offers yet —
  -- there is no price to accept — and everything else is already settled.
  if q.status not in ('sent', 'revised') then
    raise exception 'quotation_not_answerable';
  end if;

  -- Only accepting is blocked by the clock. Declining or asking for a revision
  -- on a lapsed quote is how a client tells the vendor where they stand, and
  -- refusing that would strand the thread.
  if p_action = 'accept' and q.valid_until is not null and q.valid_until < now() then
    raise exception 'quotation_expired';
  end if;

  perform set_config('sinnapi.status_reason', coalesce(v_reason, ''), true);
  update public.quotations
     set status = case p_action when 'accept' then 'accepted'
                                when 'decline' then 'declined'
                                else 'revised' end,
         responded_at = now()
   where id = p_quotation_id;
  perform set_config('sinnapi.status_reason', '', true);

  if p_action = 'accept' then
    update public.bookings b
       set advance_rate                = q.advance_rate,
           advance_release_days_before = q.advance_release_days_before,
           advance_terms_note          = q.advance_terms_note
     where b.quotation_id = p_quotation_id
       and b.client_id = auth.uid()
       -- Never re-write terms the client has already consented to.
       and b.advance_terms_accepted_at is null;
  end if;
end;$$;

-- The old 2-argument overload would still resolve for existing callers and
-- would silently drop the reason. Drop it so there is one entry point.
drop function if exists public.respond_quotation(uuid, text);

-- ---------------------------------------------------------------------
-- Grants. Both functions check their own caller, so a signed-in session may
-- call them and an unprivileged one gets a refusal rather than an effect.
-- ---------------------------------------------------------------------
grant execute on function public.void_quotation(uuid, text)          to authenticated;
grant execute on function public.respond_quotation(uuid, text, text) to authenticated;
