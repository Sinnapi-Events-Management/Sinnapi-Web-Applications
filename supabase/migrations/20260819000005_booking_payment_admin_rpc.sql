-- =====================================================================
-- Sinnapi — the booking payment window, step 5: what the console reads.
--
-- Two projections and a realtime subscription.
--
-- An RPC rather than a PostgREST select with embeds, for the reason
-- `get_booking_admin` is one: the row an operator needs to triage an unpaid
-- booking spans four tables — the booking, both parties by name, and whether
-- the client ever so much as opened a checkout — and four round trips to draw
-- one table leaves the page partially loaded for most of its life.
--
-- That last column is the one this queue exists for. "Confirmed, never paid"
-- covers two very different people: the client who started a payment and hit a
-- failure, and the client who has not touched it. The first needs help; the
-- second needs chasing. A queue that cannot tell them apart sends the same
-- message to both.
-- =====================================================================

-- ---------------------------------------------------------------------
-- search_unpaid_bookings_admin
--
-- `p_state` filters the queue the way an operator thinks about it:
--   'awaiting'  the clock is still running
--   'overdue'   the clock ran out and the booking is flagged
--   null/'all'  both
-- ---------------------------------------------------------------------
create or replace function public.search_unpaid_bookings_admin(
  p_search     text    default null,
  p_state      text    default null,
  p_sort_field text    default 'payment_due_at',
  p_sort_dir   text    default 'asc',
  p_limit      integer default 25,
  p_offset     integer default 0)
returns table (
  id                     uuid,
  reference_no           text,
  status                 booking_status,
  event_date             date,
  amount                 numeric,
  currency               text,
  client_id              uuid,
  client_name            text,
  vendor_id              uuid,
  vendor_name            text,
  payment_window_opened_at timestamptz,
  payment_due_at         timestamptz,
  payment_due_override_at timestamptz,
  payment_due_override_reason text,
  effective_due_at       timestamptz,
  payment_overdue_at     timestamptz,
  last_payment_nudge_at  timestamptz,
  payment_nudge_count    integer,
  -- Null when the client has never opened a checkout at all. Otherwise the
  -- escrow's own status ('initiated' = started and abandoned, 'failed' = the
  -- charge was attempted and bounced) and how many times they have tried.
  escrow_status          text,
  escrow_attempt_no      integer,
  total_count            bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
  v_state      text := lower(nullif(btrim(coalesce(p_state, '')), ''));
begin
  if not (public.has_permission('booking.payment.chase')
          or public.has_permission('bookings.read')) then
    perform public._forbidden();
  end if;

  -- Whitelist the sort inputs — they are interpolated as identifiers into the
  -- dynamic query below, so they must never come straight from input.
  v_sort_field := case
    when p_sort_field in ('reference_no', 'event_date', 'amount',
                          'payment_due_at', 'payment_overdue_at', 'effective_due_at')
      then p_sort_field else 'effective_due_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir, '')) = 'desc' then 'desc' else 'asc' end;

  return query execute format($q$
    select
      b.id, b.reference_no, b.status, b.event_date, b.amount, b.currency,
      b.client_id,
      coalesce(nullif(btrim(p.full_name), ''), 'Unknown client') as client_name,
      b.vendor_id,
      coalesce(v.business_name, 'Unknown vendor') as vendor_name,
      b.payment_window_opened_at,
      b.payment_due_at,
      b.payment_due_override_at,
      b.payment_due_override_reason,
      public.booking_payment_deadline(b) as effective_due_at,
      b.payment_overdue_at,
      b.last_payment_nudge_at,
      b.payment_nudge_count,
      e.status::text as escrow_status,
      e.attempt_no   as escrow_attempt_no,
      count(*) over() as total_count
    from public.bookings b
    join public.profiles p on p.id = b.client_id
    join public.vendors  v on v.id = b.vendor_id
    -- Left, and deliberately: the booking whose client never opened a checkout
    -- has no escrow row, and it is the single most important row in this queue.
    left join public.escrow_transactions e
           on e.booking_id = b.id and e.status in ('initiated', 'failed')
    where b.deleted_at is null
      and b.payment_type = 'escrow'
      and b.status = 'confirmed'
      and b.payment_settled_at is null
      and b.payment_due_at is not null
      and ($1 is null or (
            b.reference_no ilike '%%' || $1 || '%%'
            or v.business_name ilike '%%' || $1 || '%%'
            or p.full_name ilike '%%' || $1 || '%%'))
      and ($2 is null or $2 = 'all'
           or ($2 = 'overdue'  and b.payment_overdue_at is not null)
           or ($2 = 'awaiting' and b.payment_overdue_at is null))
    order by %I %s nulls last, b.reference_no asc
    limit $3 offset $4
  $q$, v_sort_field, v_sort_dir)
  using v_search, v_state, greatest(coalesce(p_limit, 25), 1), greatest(coalesce(p_offset, 0), 0);
end;$$;

comment on function public.search_unpaid_bookings_admin(text, text, text, text, integer, integer) is
  'One page of escrow bookings that are confirmed but not funded, with both parties named and whether the client ever opened a checkout.';

grant execute on function public.search_unpaid_bookings_admin(text, text, text, text, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------
-- count_unpaid_bookings_admin
--
-- The dashboard card and the tab badges. Cheap enough to call on every
-- dashboard load: it is one indexed scan of a partial index over confirmed
-- unfunded escrow bookings, which is a small set by construction — anything
-- in it is either being paid or being chased.
--
-- `due_soon` is the actionable middle: still payable, but close enough that a
-- reminder is worth sending. Fixed at six hours rather than read from the
-- reminder settings, because it answers a different question — "what should
-- someone look at this morning" rather than "when do we email".
-- ---------------------------------------------------------------------
create or replace function public.count_unpaid_bookings_admin()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not (public.has_permission('booking.payment.chase')
          or public.has_permission('bookings.read')) then
    perform public._forbidden();
  end if;

  select jsonb_build_object(
    'awaiting', count(*) filter (where b.payment_overdue_at is null),
    'due_soon', count(*) filter (where b.payment_overdue_at is null
                                   and public.booking_payment_deadline(b) <= now() + interval '6 hours'),
    'overdue',  count(*) filter (where b.payment_overdue_at is not null),
    'overdue_value', coalesce(sum(b.amount) filter (where b.payment_overdue_at is not null), 0),
    'currency', coalesce(max(b.currency), 'UGX'),
    'oldest_overdue_at', min(b.payment_overdue_at)
  ) into v
  from public.bookings b
  where b.deleted_at is null
    and b.payment_type = 'escrow'
    and b.status = 'confirmed'
    and b.payment_settled_at is null
    and b.payment_due_at is not null;

  return coalesce(v, jsonb_build_object(
    'awaiting', 0, 'due_soon', 0, 'overdue', 0,
    'overdue_value', 0, 'currency', 'UGX', 'oldest_overdue_at', null));
end;$$;

grant execute on function public.count_unpaid_bookings_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Realtime.
--
-- The trail is subscribed to by all three portals, so a reminder sent from the
-- console appears on the vendor's open booking page without a reload — and,
-- more usefully, a cancellation does. The booking row itself is already in the
-- publication, which is what carries the deadline and the overdue flag.
--
-- `add table` raises if the table is already a member, so it is guarded rather
-- than assumed: this migration has to be re-runnable.
-- ---------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'booking_payment_events')
  then
    alter publication supabase_realtime add table public.booking_payment_events;
  end if;
exception when undefined_object then
  raise notice 'supabase_realtime publication not present; skipping';
end$$;
