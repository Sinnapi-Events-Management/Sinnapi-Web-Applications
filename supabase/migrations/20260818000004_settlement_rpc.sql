-- =====================================================================
-- Sinnapi — post-event settlement, step 3: the RPCs.
--
-- Same rules as the escrow money functions: security definer with a fixed
-- search_path, authorization re-checked inside rather than assumed from RLS,
-- every amount derived server-side, idempotent wherever a cron or a double
-- click can re-enter, and the visible trail written in the same transaction as
-- the state change so the two cannot drift.
--
-- The order is the whole design and each function enforces its own place in it:
--
--   request_settlement   vendor, once the event has ended and the booking is
--                        completed. Derives what is still owed.
--   forward_settlement   admin, puts it to the client and starts their clock.
--   decide_settlement    client, approves in full or offers less with a reason.
--                        Cannot run before an admin forwarded it.
--   respond_settlement   vendor, accepts the reduction or contests it into a
--                        dispute. Only reachable on a reduction.
--   release_settlement   Finance, pays the consented figure and queues the
--                        withheld part back to the client.
--   nudge_settlement     any party, chases whoever the ball is with.
--   escalate_settlement  cron only, on an expired clock.
--
-- No function here moves money out of the platform. The last one raises a
-- payout for the manual maker-checker settlement that already exists.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Which side the caller is on. Used for the visible trail, so the timeline can
-- say "the client asked to pay less" rather than naming a uuid.
-- ---------------------------------------------------------------------
create or replace function public.settlement_actor_role(p_request_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare r public.settlement_requests;
begin
  select * into r from public.settlement_requests where id = p_request_id;
  if r.id is null or auth.uid() is null then return 'system'; end if;
  if r.client_id = auth.uid() then return 'client'; end if;
  if public.is_vendor_owner(r.vendor_id) then return 'vendor'; end if;
  return 'admin';
end;$$;

-- ---------------------------------------------------------------------
-- One step of the trail, plus the fan-out that goes with it.
--
-- Kept as a single call because a step that notified without leaving a trace —
-- or left a trace nobody was told about — is exactly the failure this flow is
-- built to prevent. `escrow_notify` supplies the escrow-shaped payload every
-- template already reads; the settlement figures are merged on top of it.
-- ---------------------------------------------------------------------
create or replace function public.settlement_notify(
  p_request_id uuid,
  p_kind       settlement_event_kind,
  p_event      escrow_event_type,
  p_trigger    text,
  p_to_client  boolean default true,
  p_to_vendor  boolean default true,
  p_to_admin   boolean default false,
  p_note       text default null,
  p_metadata   jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  r         public.settlement_requests;
  b         public.bookings;
  v_role    text;
  v_amount  numeric;
  v_payload jsonb;
begin
  select * into r from public.settlement_requests where id = p_request_id;
  if r.id is null then return; end if;
  select * into b from public.bookings where id = r.booking_id;

  v_role   := public.settlement_actor_role(p_request_id);
  -- The figure this step is *about*: what was agreed once there is an agreed
  -- figure, what was asked for before that.
  v_amount := coalesce(r.approved_amount, r.requested_amount);

  insert into public.settlement_events (request_id, kind, actor_id, actor_role, amount, note, metadata)
  values (p_request_id, p_kind, auth.uid(), v_role, v_amount, p_note, coalesce(p_metadata, '{}'::jsonb));

  v_payload := jsonb_build_object(
    'settlement_id',     r.id,
    'settlement_status', r.status,
    'requested_amount',  r.requested_amount,
    'approved_amount',   r.approved_amount,
    'withheld_amount',   greatest(coalesce(r.requested_amount - r.approved_amount, 0), 0),
    'decision',          r.decision,
    'decision_reason',   r.decision_reason,
    'client_due_at',     r.client_due_at,
    'vendor_due_at',     r.vendor_due_at,
    'event_date',        b.event_date,
    'note',              p_note,
    'actor_role',        v_role
  ) || coalesce(p_metadata, '{}'::jsonb);

  perform public.escrow_notify(
    r.escrow_id, p_event, p_trigger, p_to_client, p_to_vendor, p_to_admin, v_amount, v_payload);
end;$$;

-- ---------------------------------------------------------------------
-- Hand the escrow to the existing release machinery.
--
-- `release_requested` is the state `approve_escrow_release` expects, and it is
-- what `client_confirm_release` produces. A consented settlement is the same
-- fact arrived at through a conversation, so it lands in the same place rather
-- than inventing a parallel status the console would have to learn.
-- ---------------------------------------------------------------------
create or replace function public.settlement_open_release(
  p_escrow_id uuid, p_confirmed_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.timers_frozen_at is not null then raise exception 'escrow_frozen'; end if;
  if e.status = 'release_requested' then return; end if;              -- idempotent
  if e.status not in ('held', 'advance_released') then
    raise exception 'escrow_not_releasable: %', e.status;
  end if;

  update public.escrow_transactions
     set status = 'release_requested',
         client_confirmed_at = coalesce(client_confirmed_at, p_confirmed_at)
   where id = p_escrow_id;
end;$$;
revoke all on function public.settlement_open_release(uuid, timestamptz) from anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. THE VENDOR ASKS.
--
-- The amount is read off the escrow, never from the caller: the balance
-- tranche, plus the advance if it never went out. A vendor whose advance has
-- already been raised is asking only for what is left.
-- ---------------------------------------------------------------------
create or replace function public.request_settlement(
  p_booking_id uuid,
  p_note       text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  e       public.escrow_transactions;
  v_id    uuid;
  v_amt   numeric;
  v_hours integer;
  v_due   timestamptz;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(b.vendor_id) then perform public._forbidden(); end if;

  -- Completion is already gated on the event having ended, so this inherits
  -- that gate rather than re-deriving it: there is no way to reach `completed`
  -- before the event is over except an admin override with a written reason.
  if b.status <> 'completed' then raise exception 'booking_not_completed'; end if;

  select * into e from public.escrow_transactions where booking_id = p_booking_id for update;
  if e.id is null then raise exception 'escrow_not_funded'; end if;
  if e.timers_frozen_at is not null then raise exception 'escrow_frozen'; end if;
  if e.status not in ('held', 'advance_released') then
    raise exception 'escrow_not_releasable: %', e.status;
  end if;

  if exists (select 1 from public.settlement_requests s
             where s.booking_id = p_booking_id
               and s.status in ('vendor_requested', 'admin_forwarded',
                                'awaiting_vendor_consent', 'consented')) then
    raise exception 'settlement_already_open';
  end if;

  v_amt := e.balance_amount
           + case when e.advance_released_at is null then e.advance_amount else 0 end;
  if v_amt <= 0 then raise exception 'nothing_to_settle'; end if;

  v_hours := coalesce((public.get_setting('settlement_admin_response_hours') #>> '{}')::integer, 2);
  v_due   := now() + make_interval(hours => v_hours);

  insert into public.settlement_requests (
      booking_id, escrow_id, vendor_id, client_id, currency,
      requested_amount, vendor_note, requested_by, admin_due_at, status)
  values (b.id, e.id, b.vendor_id, e.client_id, e.currency,
      v_amt, nullif(btrim(p_note), ''), auth.uid(), v_due, 'vendor_requested')
  returning id into v_id;

  -- Admins first, because they are the ones who have to act. The vendor gets a
  -- copy as a receipt — they have just asked for money and should be able to
  -- see, from their own inbox, that the ask landed.
  --
  -- The client is deliberately not told yet. They are told when an admin puts
  -- the figure to them, which is minutes later and is the message they can
  -- actually act on; telling them twice invites them to answer the first one
  -- somewhere we are not listening.
  perform public.settlement_notify(
    v_id, 'requested', 'settlement_requested', 'settlement.requested',
    false, true, true, nullif(btrim(p_note), ''),
    jsonb_build_object('admin_due_at', v_due));

  return v_id;
end;$$;

-- ---------------------------------------------------------------------
-- 2. THE ADMIN PUTS IT TO THE CLIENT.
--
-- Behind `settlement.manage` rather than `escrow.release`: this asks a
-- question, it does not answer one, and support staff chasing a stalled payout
-- should not need the key to the money to do it.
-- ---------------------------------------------------------------------
create or replace function public.forward_settlement(
  p_request_id uuid,
  p_note       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.settlement_requests; v_hours integer; v_due timestamptz;
begin
  if not public.has_permission('settlement.manage') then perform public._forbidden(); end if;

  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status = 'admin_forwarded' then return; end if;                -- idempotent
  if r.status <> 'vendor_requested' then raise exception 'invalid_state: %', r.status; end if;

  v_hours := coalesce((public.get_setting('settlement_client_response_hours') #>> '{}')::integer, 6);
  v_due   := now() + make_interval(hours => v_hours);

  update public.settlement_requests
     set status = 'admin_forwarded', forwarded_by = auth.uid(), forwarded_at = now(),
         admin_note = nullif(btrim(p_note), ''), client_due_at = v_due
   where id = p_request_id;

  perform public.settlement_notify(
    p_request_id, 'forwarded', 'settlement_forwarded', 'settlement.forwarded',
    true, true, false, nullif(btrim(p_note), ''),
    jsonb_build_object('response_hours', v_hours, 'due_at', v_due));
end;$$;

-- ---------------------------------------------------------------------
-- 3. THE CLIENT DECIDES.
--
-- Two outcomes, one entry point, because they are one decision: how much of
-- what the vendor asked for is actually owed. `p_consent` is not decoration —
-- the amount that leaves escrow is the amount someone said out loud they were
-- willing to pay, and a decision recorded without it is worth nothing when it
-- is later questioned.
--
-- A reduction needs a reason in the client's own words. The vendor is about to
-- be asked to accept less than they invoiced; "the client said no" is not
-- something they can answer.
-- ---------------------------------------------------------------------
create or replace function public.decide_settlement(
  p_request_id uuid,
  p_decision   text,
  p_amount     numeric default null,
  p_reason     text    default null,
  p_consent    boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  r        public.settlement_requests;
  v_hours  integer;
  v_due    timestamptz;
  v_amount numeric;
  v_reason text;
begin
  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.client_id <> auth.uid() then perform public._forbidden(); end if;
  if r.status in ('consented', 'awaiting_vendor_consent') then return; end if;   -- idempotent
  if r.status <> 'admin_forwarded' then raise exception 'invalid_state: %', r.status; end if;
  if p_decision not in ('full', 'reduced') then raise exception 'unsupported_decision'; end if;
  if not coalesce(p_consent, false) then raise exception 'consent_required'; end if;

  v_reason := nullif(btrim(p_reason), '');
  if length(coalesce(v_reason, '')) > 1000 then raise exception 'reason_too_long'; end if;

  if p_decision = 'full' then
    v_amount := r.requested_amount;

    update public.settlement_requests
       set decision = 'full', approved_amount = v_amount, decision_reason = v_reason,
           decided_by = auth.uid(), decided_at = now(), client_consent_at = now(),
           status = 'consented'
     where id = p_request_id;

    -- Nobody is being asked to take less, so there is nothing for the vendor to
    -- consent to and the escrow can go straight to the release queue.
    perform public.settlement_open_release(r.escrow_id, now());

    perform public.settlement_notify(
      p_request_id, 'decided', 'settlement_decided', 'settlement.approved_full',
      true, true, true, v_reason, jsonb_build_object('decision', 'full'));
    return;
  end if;

  -- ---- reduced ----
  if p_amount is null then raise exception 'amount_required'; end if;
  v_amount := round(p_amount, 2);
  if v_amount < 0 then raise exception 'invalid_amount'; end if;
  if v_amount >= r.requested_amount then raise exception 'reduction_required'; end if;
  if v_reason is null then raise exception 'reason_required'; end if;

  v_hours := coalesce((public.get_setting('settlement_vendor_response_hours') #>> '{}')::integer, 6);
  v_due   := now() + make_interval(hours => v_hours);

  update public.settlement_requests
     set decision = 'reduced', approved_amount = v_amount, decision_reason = v_reason,
         decided_by = auth.uid(), decided_at = now(), client_consent_at = now(),
         vendor_due_at = v_due, status = 'awaiting_vendor_consent'
   where id = p_request_id;

  -- Everyone, including the admins: a reduction is the point at which this
  -- stops being routine and someone may have to mediate it.
  perform public.settlement_notify(
    p_request_id, 'decided', 'settlement_decided', 'settlement.reduced',
    true, true, true, v_reason,
    jsonb_build_object('decision', 'reduced', 'response_hours', v_hours, 'due_at', v_due));
end;$$;

-- ---------------------------------------------------------------------
-- 4. THE VENDOR ANSWERS A REDUCTION.
--
-- Accept and the figure is settled by agreement. Contest and it becomes a
-- dispute, which freezes the timers and puts a human between the parties —
-- the same machinery a client uses when a service goes wrong, because this is
-- the same kind of disagreement seen from the other side.
--
-- There is no third branch, and the cron never writes one. Silence from a
-- vendor is not acceptance of a smaller payment.
-- ---------------------------------------------------------------------
create or replace function public.respond_settlement(
  p_request_id uuid,
  p_response   text,
  p_note       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.settlement_requests; v_note text; v_dispute uuid;
begin
  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(r.vendor_id) then perform public._forbidden(); end if;
  if r.status in ('consented', 'contested') then return; end if;      -- idempotent
  if r.status <> 'awaiting_vendor_consent' then raise exception 'invalid_state: %', r.status; end if;
  if p_response not in ('accepted', 'contested') then raise exception 'unsupported_response'; end if;

  v_note := nullif(btrim(p_note), '');
  if length(coalesce(v_note, '')) > 1000 then raise exception 'reason_too_long'; end if;

  if p_response = 'accepted' then
    update public.settlement_requests
       set vendor_response = 'accepted', vendor_response_note = v_note,
           vendor_responded_at = now(), vendor_consent_at = now(), status = 'consented'
     where id = p_request_id;

    perform public.settlement_open_release(r.escrow_id, coalesce(r.decided_at, now()));

    perform public.settlement_notify(
      p_request_id, 'vendor_accepted', 'settlement_consented', 'settlement.vendor_accepted',
      true, true, true, v_note, jsonb_build_object('response', 'accepted'));
    return;
  end if;

  -- ---- contested ----
  if v_note is null then raise exception 'reason_required'; end if;

  v_dispute := public.open_dispute(
    r.escrow_id,
    format('Vendor contests a reduced settlement: asked %s %s, offered %s %s. %s',
           r.currency, r.requested_amount, r.currency, r.approved_amount, v_note));

  update public.settlement_requests
     set vendor_response = 'contested', vendor_response_note = v_note,
         vendor_responded_at = now(), status = 'contested', dispute_id = v_dispute
   where id = p_request_id;

  perform public.settlement_notify(
    p_request_id, 'vendor_contested', 'settlement_contested', 'settlement.vendor_contested',
    true, true, true, v_note, jsonb_build_object('dispute_id', v_dispute));
end;$$;

-- ---------------------------------------------------------------------
-- 5. FINANCE PAYS THE CONSENTED FIGURE.
--
-- Full approval delegates to `approve_escrow_release` unchanged — same ledger,
-- same payout, same audit — because a full settlement *is* the ordinary
-- release, reached by a different conversation.
--
-- A reduction cannot delegate: that function pays the whole balance by
-- construction. It is re-implemented here for the reduced case with one
-- deliberate difference in the split —
--
--   the vendor is paid `approved_amount`;
--   commission and the processing fee are recognised in full, because Sinnapi
--     and the processor did their work whatever the parties settled on;
--   the withheld remainder stays in the held pool and is raised as a refund
--     request in the client's name, for the existing refund maker-checker to
--     approve and settle.
--
-- That last point is why nothing here debits the withheld amount: the refund
-- path does it, and debiting twice would unbalance the escrow account.
-- ---------------------------------------------------------------------
create or replace function public.release_settlement(p_request_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  r         public.settlement_requests;
  e         public.escrow_transactions;
  v_payout  uuid;
  v_refund  uuid;
  v_bank    uuid;
  v_label   text;
  v_blocked text;
  v_withheld numeric;
  v_debit   numeric;
  v_settled numeric;
  v_grp     uuid;
begin
  if not public.has_permission('escrow.release') then perform public._forbidden(); end if;

  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status = 'released' then return r.payout_id; end if;           -- idempotent
  if r.status <> 'consented' then raise exception 'invalid_state: %', r.status; end if;

  select * into e from public.escrow_transactions where id = r.escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.timers_frozen_at is not null then raise exception 'escrow_frozen'; end if;

  -- ---- full: the ordinary release ----
  if r.approved_amount >= r.requested_amount then
    v_payout := public.approve_escrow_release(r.escrow_id);

    update public.settlement_requests
       set status = 'released', released_by = auth.uid(), released_at = now(), payout_id = v_payout
     where id = p_request_id;

    perform public.settlement_notify(
      p_request_id, 'released', 'settlement_released', 'settlement.released',
      true, true, true, null,
      jsonb_build_object('payout_id', v_payout, 'final_amount', r.approved_amount));
    return v_payout;
  end if;

  -- ---- reduced ----
  if e.status <> 'release_requested' then
    raise exception 'escrow_not_releasable: %', e.status;
  end if;

  v_withheld := r.requested_amount - r.approved_amount;

  if r.approved_amount > 0 then
    select ba.id, ba.bank_name || ' ••••' || coalesce(ba.account_number_last4, '')
      into v_bank, v_label
    from public.vendor_bank_accounts ba
    where ba.vendor_id = e.vendor_id and ba.is_primary and ba.deleted_at is null
    limit 1;
    -- Raised either way, flagged when there is nowhere to send it. Money that
    -- is owed should be visibly owed even when it cannot yet be moved.
    if v_bank is null then v_blocked := 'vendor_has_no_primary_bank_account'; end if;

    insert into public.payouts (vendor_id, escrow_id, bank_account_id, amount, currency,
        kind, status, requested_by, destination_label, blocked_reason, due_at)
    values (e.vendor_id, e.id, v_bank, r.approved_amount, e.currency,
        'balance', 'requested', auth.uid(), v_label, v_blocked, now())
    returning id into v_payout;
  end if;

  -- What actually leaves the held pool now. The withheld part stays put until
  -- the refund is approved, which is what debits it.
  v_debit := r.approved_amount + e.commission_amount + e.psp_fee_amount;
  if v_debit > 0 then
    v_grp := gen_random_uuid();
    perform public.post_ledger(v_grp, 'escrow_held', 'debit', v_debit, e.currency,
                               'Settlement released', e.id, null, v_payout);
    if r.approved_amount > 0 then
      perform public.post_ledger(v_grp, 'vendor_payable', 'credit', r.approved_amount, e.currency,
                                 'Vendor settlement', e.id, null, v_payout);
    end if;
    if e.commission_amount > 0 then
      perform public.post_ledger(v_grp, 'commission_revenue', 'credit', e.commission_amount,
                                 e.currency, 'Platform commission', e.id);
    end if;
    if e.psp_fee_amount > 0 then
      perform public.post_ledger(v_grp, 'psp_fee_expense', 'credit', e.psp_fee_amount,
                                 e.currency, 'Processing fee recovered', e.id);
    end if;
    perform public.assert_balanced(v_grp);
  end if;

  -- The shortfall goes back to the client, raised in their name because it was
  -- their reduction. That also keeps the refund's maker-checker honest: the
  -- requester is the client, so any Finance admin may approve it.
  select coalesce(sum(amount), 0) into v_settled
  from public.payouts where escrow_id = e.id and status = 'completed';

  insert into public.refunds (escrow_id, client_id, amount, currency, type, reason, reason_code,
      status, requested_by, agreed_component, commission_component, psp_fee_component,
      refundable_ceiling, shortfall_amount)
  values (e.id, e.client_id, v_withheld, e.currency, 'partial',
      format('Withheld from the vendor settlement by agreement: %s', r.decision_reason),
      'admin_discretion', 'requested', coalesce(r.decided_by, e.client_id),
      -- Only the vendor's own component is returned. Commission and the
      -- processing fee were earned on a booking that happened; the parties
      -- adjusted what the vendor is paid, not what the platform charged.
      v_withheld, 0, 0,
      greatest(e.gross_amount - v_settled, 0), 0)
  returning id into v_refund;

  update public.escrow_transactions
     set status = 'payout_approved',
         admin_approved_by = auth.uid(), admin_approved_at = now(),
         balance_released_at = now()
   where id = e.id;

  update public.settlement_requests
     set status = 'released', released_by = auth.uid(), released_at = now(),
         payout_id = v_payout, refund_id = v_refund
   where id = p_request_id;

  perform public.settlement_notify(
    p_request_id, 'released', 'settlement_released', 'settlement.released',
    true, true, true, null,
    jsonb_build_object('payout_id', v_payout, 'refund_id', v_refund,
                       'final_amount', r.approved_amount, 'refunded_amount', v_withheld));

  return v_payout;
end;$$;

-- ---------------------------------------------------------------------
-- 6. CHASING.
--
-- Any party may nudge, and the nudge always goes to whoever the request is
-- waiting on — not to everybody, which is how a chase turns into noise nobody
-- reads. The cooldown is per request rather than per sender: two people from
-- the same side chasing an hour apart is still two interruptions to the person
-- being chased.
-- ---------------------------------------------------------------------
create or replace function public.nudge_settlement(
  p_request_id uuid,
  p_note       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r        public.settlement_requests;
  v_mins   integer;
  v_role   text;
  v_client boolean := false;
  v_vendor boolean := false;
  v_admin  boolean := false;
  v_target text;
begin
  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then raise exception 'not_found'; end if;

  v_role := public.settlement_actor_role(p_request_id);
  if v_role = 'admin' and not (public.has_permission('settlement.manage')
                               or public.has_permission('escrow.read')) then
    perform public._forbidden();
  end if;

  if r.status not in ('vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent', 'consented')
  then raise exception 'invalid_state: %', r.status; end if;

  v_mins := coalesce((public.get_setting('settlement_nudge_cooldown_minutes') #>> '{}')::integer, 60);
  if r.last_nudge_at is not null
     and r.last_nudge_at > now() - make_interval(mins => v_mins) then
    raise exception 'nudge_too_soon';
  end if;

  -- Whose turn it is, in one place. The UI says the same thing from the same
  -- rule, so a "waiting on you" badge and the reminder that arrives can never
  -- name different people.
  case r.status
    when 'vendor_requested'        then v_admin  := true; v_target := 'admin';
    when 'admin_forwarded'         then v_client := true; v_target := 'client';
    when 'awaiting_vendor_consent' then v_vendor := true; v_target := 'vendor';
    when 'consented'               then v_admin  := true; v_target := 'admin';
  end case;

  update public.settlement_requests
     set last_nudge_at = now(), nudge_count = nudge_count + 1
   where id = p_request_id;

  perform public.settlement_notify(
    p_request_id, 'nudged', 'settlement_nudged', 'settlement.nudge',
    v_client, v_vendor, v_admin, nullif(btrim(p_note), ''),
    jsonb_build_object('target', v_target, 'from_role', v_role));
end;$$;

-- ---------------------------------------------------------------------
-- 7. WITHDRAWING.
--
-- The vendor who asked may take it back — they invoiced twice, or the client
-- has settled with them another way — and an admin may withdraw one that was
-- raised in error. Not available once the money has been released.
-- ---------------------------------------------------------------------
create or replace function public.cancel_settlement(
  p_request_id uuid,
  p_reason     text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.settlement_requests; v_reason text;
begin
  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if not (public.is_vendor_owner(r.vendor_id) or public.has_permission('settlement.manage')) then
    perform public._forbidden();
  end if;
  if r.status = 'cancelled' then return; end if;                      -- idempotent
  if r.status in ('released', 'contested') then raise exception 'invalid_state: %', r.status; end if;

  v_reason := nullif(btrim(p_reason), '');
  if v_reason is null then raise exception 'reason_required'; end if;

  update public.settlement_requests
     set status = 'cancelled', cancel_reason = v_reason
   where id = p_request_id;

  perform public.settlement_notify(
    p_request_id, 'cancelled', 'settlement_cancelled', 'settlement.cancelled',
    true, true, true, v_reason, '{}'::jsonb);
end;$$;

-- ---------------------------------------------------------------------
-- 8. EXPIRED CLOCKS — cron only.
--
-- One rule per clock, and only one of them advances anything:
--
--   client silent past client_due_at  → recorded as a full approval and handed
--       to Finance for approval. The vendor asked for what the escrow already
--       held for them, the client was asked directly and did not object within
--       the window they were told about, and holding a finished event's money
--       indefinitely on silence is its own kind of unfair. A human still
--       approves the payout; this moves no money.
--
--   vendor silent past vendor_due_at  → nobody's position changes. The vendor
--       has been asked to accept less than they invoiced and silence is not
--       an answer to that. Admins are told so a person can pick up the phone.
--
--   admin silent past admin_due_at    → the request has not been put to anyone
--       yet, so there is nothing to auto-approve. Admins are chased.
-- ---------------------------------------------------------------------
create or replace function public.escalate_settlement(p_request_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare r public.settlement_requests;
begin
  select * into r from public.settlement_requests where id = p_request_id for update;
  if r.id is null then return 'not_found'; end if;

  -- ---- client ran out of time ----
  if r.status = 'admin_forwarded'
     and r.client_due_at is not null and r.client_due_at <= now() then

    update public.settlement_requests
       set decision = 'full', approved_amount = requested_amount,
           decided_at = now(), decided_automatically = true, status = 'consented'
     where id = p_request_id;

    -- If the escrow moved under us — a dispute, a refund — leave it alone and
    -- let the admins see a consented request they cannot release yet, rather
    -- than forcing a state the money machinery has already ruled out.
    begin
      perform public.settlement_open_release(r.escrow_id, now());
    exception when others then
      null;
    end;

    perform public.settlement_notify(
      p_request_id, 'escalated', 'settlement_escalated', 'settlement.client_timeout',
      true, true, true, null, jsonb_build_object('reason', 'client_no_response'));
    return 'client_timeout';
  end if;

  -- ---- vendor ran out of time on a reduction ----
  if r.status = 'awaiting_vendor_consent'
     and r.vendor_due_at is not null and r.vendor_due_at <= now() then
    perform public.settlement_notify(
      p_request_id, 'escalated', 'settlement_escalated', 'settlement.vendor_timeout',
      false, true, true, null, jsonb_build_object('reason', 'vendor_no_response'));
    return 'vendor_timeout';
  end if;

  -- ---- nobody has forwarded it ----
  if r.status = 'vendor_requested'
     and r.admin_due_at is not null and r.admin_due_at <= now() then
    perform public.settlement_notify(
      p_request_id, 'escalated', 'settlement_escalated', 'settlement.admin_overdue',
      false, true, true, null, jsonb_build_object('reason', 'not_forwarded'));
    return 'admin_overdue';
  end if;

  return 'noop';
end;$$;
revoke all on function public.escalate_settlement(uuid) from anon, authenticated;
grant execute on function public.escalate_settlement(uuid) to service_role;

-- ---------------------------------------------------------------------
-- The two existing release paths, taught about this one.
--
-- `approve_escrow_release` is reachable from the escrow console on any escrow
-- in `release_requested`, and it pays the full balance by construction. With a
-- reduction agreed, that is an overpayment — and an overpayment that has
-- already been consented to at a lower figure by three parties is not a
-- rounding problem, it is a payment nobody authorised. It now refuses and says
-- where to go instead.
--
-- `client_confirm_release` is the reverse case: a client who confirms from
-- their own escrow card while a request is open has approved it in full by any
-- reading, so the open request is closed as a full approval rather than left
-- to expire on a booking that has already been settled.
-- ---------------------------------------------------------------------
create or replace function public.approve_escrow_release(p_escrow_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e        public.escrow_transactions;
  v_grp    uuid;
  v_payout uuid;
  v_bank   uuid;
  v_label  text;
  v_blocked text;
  v_held   numeric;
begin
  if not public.has_permission('escrow.release') then perform public._forbidden(); end if;

  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status <> 'release_requested' then
    raise exception 'invalid_state: need client confirmation or auto-release first (%)', e.status;
  end if;

  -- An open settlement that is not a full approval has to go through
  -- release_settlement, which pays the agreed figure and returns the rest.
  if exists (
    select 1 from public.settlement_requests s
    where s.escrow_id = p_escrow_id
      and s.status in ('vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent', 'consented')
      and (s.approved_amount is null or s.approved_amount < s.requested_amount)
  ) then
    raise exception 'settlement_pending';
  end if;

  select ba.id, ba.bank_name || ' ••••' || coalesce(ba.account_number_last4, '')
    into v_bank, v_label
  from public.vendor_bank_accounts ba
  where ba.vendor_id = e.vendor_id and ba.is_primary and ba.deleted_at is null
  limit 1;
  if v_bank is null then v_blocked := 'vendor_has_no_primary_bank_account'; end if;

  update public.escrow_transactions
     set status = 'payout_approved',
         admin_approved_by = auth.uid(),
         admin_approved_at = now(),
         balance_released_at = now()
   where id = p_escrow_id;

  v_held := e.balance_amount + e.commission_amount + e.psp_fee_amount
            + case when e.advance_released_at is null then e.advance_amount else 0 end;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp, 'escrow_held', 'debit', v_held, e.currency,
                             'Escrow released', p_escrow_id);
  perform public.post_ledger(v_grp, 'vendor_payable', 'credit',
                             e.balance_amount
                               + case when e.advance_released_at is null then e.advance_amount else 0 end,
                             e.currency, 'Vendor balance', p_escrow_id);
  if e.commission_amount > 0 then
    perform public.post_ledger(v_grp, 'commission_revenue', 'credit', e.commission_amount,
                               e.currency, 'Platform commission', p_escrow_id);
  end if;
  if e.psp_fee_amount > 0 then
    perform public.post_ledger(v_grp, 'psp_fee_expense', 'credit', e.psp_fee_amount,
                               e.currency, 'Processing fee recovered', p_escrow_id);
  end if;
  perform public.assert_balanced(v_grp);

  insert into public.payouts (vendor_id, escrow_id, bank_account_id, amount, currency,
      kind, status, requested_by, destination_label, blocked_reason, due_at)
  values (e.vendor_id, e.id, v_bank,
      e.balance_amount + case when e.advance_released_at is null then e.advance_amount else 0 end,
      e.currency, 'balance', 'requested', auth.uid(), v_label, v_blocked, now())
  returning id into v_payout;

  perform public.escrow_notify(
    p_escrow_id, 'payout_approved', 'escrow.release_approved',
    true, true, true, e.balance_amount, jsonb_build_object('payout_id', v_payout));

  return v_payout;
end;$$;

create or replace function public.client_confirm_release(p_escrow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; b public.bookings; r public.settlement_requests;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.client_id <> auth.uid() then perform public._forbidden(); end if;
  if e.status = 'release_requested' then return; end if;              -- idempotent
  if e.status not in ('held', 'advance_released') then
    raise exception 'invalid_state: %', e.status;
  end if;

  select * into b from public.bookings where id = e.booking_id;
  if b.status <> 'completed' then raise exception 'booking_not_completed'; end if;

  update public.escrow_transactions
     set status = 'release_requested', client_confirmed_at = now()
   where id = p_escrow_id;

  -- Confirming the service from the escrow card answers any open request in
  -- full. Recorded as the client's own decision, because it is one.
  select * into r from public.settlement_requests
   where escrow_id = p_escrow_id
     and status in ('vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent')
   order by requested_at desc limit 1;

  if r.id is not null then
    update public.settlement_requests
       set decision = 'full', approved_amount = requested_amount, decided_by = auth.uid(),
           decided_at = now(), client_consent_at = now(), status = 'consented'
     where id = r.id;

    perform public.settlement_notify(
      r.id, 'decided', 'settlement_decided', 'settlement.approved_full',
      true, true, true, null,
      jsonb_build_object('decision', 'full', 'source', 'escrow_confirmation'));
  end if;

  perform public.escrow_notify(
    p_escrow_id, 'release_requested', 'escrow.release_requested',
    true, true, true, e.balance_amount, jsonb_build_object('source', 'client'));
end;$$;

-- ---------------------------------------------------------------------
-- Grants. Each function authorises its own caller, which is why the party
-- facing ones are open to `authenticated` rather than to a role.
-- ---------------------------------------------------------------------
-- The fan-out helper is internal: every caller below runs it inside its own
-- transaction as the definer. Exposed to a portal it would be a way to write
-- the visible trail and mail all three parties without changing anything.
revoke all on function public.settlement_notify(
  uuid, settlement_event_kind, escrow_event_type, text, boolean, boolean, boolean, text, jsonb)
  from anon, authenticated;

grant execute on function public.settlement_actor_role(uuid)                   to authenticated;
grant execute on function public.request_settlement(uuid, text)                to authenticated;
grant execute on function public.forward_settlement(uuid, text)                to authenticated;
grant execute on function public.decide_settlement(uuid, text, numeric, text, boolean) to authenticated;
grant execute on function public.respond_settlement(uuid, text, text)          to authenticated;
grant execute on function public.release_settlement(uuid)                      to authenticated;
grant execute on function public.nudge_settlement(uuid, text)                  to authenticated;
grant execute on function public.cancel_settlement(uuid, text)                 to authenticated;
