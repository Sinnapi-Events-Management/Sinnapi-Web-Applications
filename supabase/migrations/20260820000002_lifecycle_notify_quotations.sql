-- =====================================================================
-- Sinnapi — 0820b Quotations: a notification for every stage
--
-- WHY A STATUS TRIGGER AND NOT AN EMIT IN EACH RPC
-- Six things write `quotations.status` and they do not share a shape: an RPC
-- the client calls (`respond_quotation`), an RPC the vendor calls
-- (`send_quotation`), one either may call (`void_quotation`), an INSERT
-- (`request_quotation`), and a bare `update` inside the hourly `sinnapi_quote_expiry`
-- cron that runs as no user at all. Putting the emit in each of them would mean
-- five copies of the same fan-out, a sixth writer added later that nobody
-- remembers to wire, and — for the cron — an emit in a pg_cron statement.
--
-- A trigger on the transition is the one place all six already pass through. It
-- also means the notification is a function of the state change rather than of
-- the caller, so a quote that becomes `accepted` notifies the vendor whether a
-- client accepted it, an admin repaired it, or a backfill moved it.
--
-- WHO HEARS ABOUT WHAT
--   requested   -> vendor    a request sitting in their queue
--   sent        -> client    an offer with a price and a clock on it
--   revised     -> vendor    the client wants changes
--   accepted    -> vendor    the deal is on
--   declined    -> vendor    plus admin: a decline is an exception worth seeing
--   voided      -> the other party, plus admin
--   expired     -> both      neither of them did this; both need to know
--   draft       -> nobody    a vendor's own work in progress
--
-- The party who *acted* is never notified about their own click. That is the
-- `is distinct from auth.uid()` on each arm, and it is why `voided` resolves
-- its recipient rather than naming one: either side can void.
-- =====================================================================

-- ---------------------------------------------------------------------
-- void_quotation — the same function, minus the notification it used to send
-- for itself.
--
-- Body as 0816f. The trailing `insert into public.notifications` is gone: the
-- status trigger below now covers `voided` for both directions, and leaving
-- both in place would tell the other party twice. The reason travels to the
-- trigger the same way it already travels to `tg_quotation_history` — through
-- the `sinnapi.status_reason` GUC set immediately before the update — so no
-- copy is lost in the move.
-- ---------------------------------------------------------------------
create or replace function public.void_quotation(
  p_quotation_id uuid,
  p_reason       text)
returns void language plpgsql security definer set search_path = public as $$
declare
  q           public.quotations;
  v_is_client boolean;
  v_is_vendor boolean;
  v_reason    text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
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
     set status     = 'voided'::quotation_status,
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_quotation_id;
  perform set_config('sinnapi.status_reason', '', true);

  -- `responded_at` is deliberately left alone. It means "the client answered
  -- the offer", and a withdrawal by either side is not an answer to it — the
  -- history row is the record of what happened and when.
end;$$;

comment on function public.void_quotation(uuid, text) is
  'Either party withdraws an unanswered quotation, with a mandatory reason. The other party is '
  'notified by tg_quotation_notify off the status transition.';

-- ---------------------------------------------------------------------
-- The payload every quotation notification renders from.
--
-- Built once per transition rather than per recipient: a void tells the other
-- party and the admin desk, and resolving the same five columns twice for one
-- event is work the money path already taught us not to do.
--
-- `reason` comes from the GUC rather than from a column because `quotations`
-- has none to hold one — the same gap `tg_quotation_history` works around, and
-- for the same transitions.
-- ---------------------------------------------------------------------
create or replace function public.quotation_notify_payload(q public.quotations)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'quotation_id', q.id,
    'reference_no', q.reference_no,
    'quote_ref',    q.reference_no,
    'vendor_id',    q.vendor_id,
    'client_id',    q.client_id,
    'currency',     q.currency,
    'total',        q.total,
    'valid_until',  q.valid_until,
    'reason',       nullif(current_setting('sinnapi.status_reason', true), ''));
$$;

-- ---------------------------------------------------------------------
-- tg_quotation_notify — one notification per transition that means something.
-- ---------------------------------------------------------------------
create or replace function public.tg_quotation_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_payload jsonb;
begin
  -- An UPDATE that did not move the status is bookkeeping. The blanket outbox
  -- trigger this replaces notified on those too, which is most of why the old
  -- quote feed was unreadable.
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select owner_id into v_owner from public.vendors where id = new.vendor_id;
  v_payload := public.quotation_notify_payload(new);

  case new.status
    when 'requested' then
      -- Only on INSERT. A quote returning to `requested` is not a thing the
      -- product does, and if it ever became one it would not be a new request.
      if tg_op = 'INSERT' and v_owner is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.requested', v_owner, 'vendor', 'quotations', new.id, v_payload);
      end if;

    when 'sent' then
      if new.client_id is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.sent', new.client_id, 'client', 'quotations', new.id, v_payload);
      end if;

    when 'revised' then
      if v_owner is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.revision_requested', v_owner, 'vendor', 'quotations', new.id, v_payload);
      end if;

    when 'accepted' then
      if v_owner is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.accepted', v_owner, 'vendor', 'quotations', new.id, v_payload);
      end if;

    when 'declined' then
      if v_owner is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.declined', v_owner, 'vendor', 'quotations', new.id, v_payload);
      end if;
      perform public.notify_admins(
        'quotation.declined', 'quotations.read', 'quotations', new.id, v_payload);

    when 'voided' then
      -- Either side can withdraw, so the recipient is whoever did not. An
      -- admin voiding on someone's behalf is not either party, and both hear.
      if new.client_id is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.voided', new.client_id, 'client', 'quotations', new.id,
          v_payload || jsonb_build_object('voided_by', 'vendor'));
      end if;
      if v_owner is distinct from auth.uid() then
        perform public.notify_party(
          'quotation.voided', v_owner, 'vendor', 'quotations', new.id,
          v_payload || jsonb_build_object('voided_by', 'client'));
      end if;
      perform public.notify_admins(
        'quotation.voided', 'quotations.read', 'quotations', new.id, v_payload);

    when 'expired' then
      -- The clock did this, not a person, so nobody is the actor and both
      -- sides are told. This is the transition that was most completely silent:
      -- the hourly cron is a bare `update ... set status='expired'`.
      perform public.notify_party(
        'quotation.expired', new.client_id, 'client', 'quotations', new.id, v_payload);
      perform public.notify_party(
        'quotation.expired', v_owner, 'vendor', 'quotations', new.id, v_payload);

    else
      -- `draft` is the vendor's own work in progress. Nobody is waiting on it.
      null;
  end case;

  return new;
end;$$;

drop trigger if exists trg_quotation_notify on public.quotations;
create trigger trg_quotation_notify
  after insert or update of status on public.quotations
  for each row execute function public.tg_quotation_notify();

comment on function public.tg_quotation_notify() is
  'Fans a quotation status transition out to the party who did not cause it, and to the admin '
  'desk for the exception states (declined, voided).';
