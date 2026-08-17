-- =====================================================================
-- Sinnapi — the booking payment window, step 2: schema.
--
-- The clock lives on `bookings`, not on `escrow_transactions`. That is the
-- whole design decision in this file and it is forced by the case the flow
-- exists for: a client who never opened a checkout has no escrow row, so a
-- deadline stored there would be a deadline that only exists once the client
-- has already started doing the thing we are chasing them to do.
--
-- The trail gets its own append-only table beside it, for the same reason
-- `settlement_events` is not folded into `settlement_requests`: "who chased
-- whom, when, and what the client was told" is the record that answers a
-- vendor asking why their date was released, and it must not be rewritable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- When a booking's event *starts*, in absolute time.
--
-- The mirror of `booking_end_at`, which the completion gate already uses, and
-- read through the same zone for the same reason: bookings store a bare date
-- and a bare time, and every event they describe happens in Uganda.
--
-- No start time means the event owns the day, so it starts at the first moment
-- of that day. That is the conservative reading for a payment clamp — it is
-- the earliest instant the event could be under way, and a deadline should
-- never sit inside an event that may already have begun.
-- ---------------------------------------------------------------------
create or replace function public.booking_start_at(p_event_date date, p_start_time time)
returns timestamptz language sql stable set search_path = public as $$
  select case
    when p_event_date is null then null
    when p_start_time is null then (p_event_date::timestamp) at time zone 'Africa/Kampala'
    else ((p_event_date + p_start_time)::timestamp) at time zone 'Africa/Kampala'
  end;
$$;

comment on function public.booking_start_at(date, time) is
  'When a booking''s event begins, in absolute time: event_date + start_time, or midnight at the top of event_date when no start time was agreed. Read in Africa/Kampala. Mirrors booking_end_at.';

grant execute on function public.booking_start_at(date, time) to authenticated;

-- ---------------------------------------------------------------------
-- The clock, on the booking.
-- ---------------------------------------------------------------------
alter table public.bookings
  -- When payment first became possible: vendor confirmed AND terms accepted.
  -- Stamped once and never moved, so a booking whose terms are renegotiated
  -- does not silently restart the client's clock.
  add column if not exists payment_window_opened_at   timestamptz,
  -- The deadline in force. Computed from the setting at the moment the window
  -- opens and then *stored*, not recomputed on read: an admin editing
  -- `booking_payment_window_hours` must not retroactively expire bookings
  -- whose clients were promised a different window, which is the same reason
  -- escrow snapshots its rates at funding.
  add column if not exists payment_due_at             timestamptz,
  -- An admin's extension for this one booking. Kept separate from
  -- `payment_due_at` rather than overwriting it so the trail can still show
  -- what the deadline originally was and by how much it moved.
  add column if not exists payment_due_override_at    timestamptz,
  add column if not exists payment_due_override_by    uuid references public.profiles(id),
  add column if not exists payment_due_override_reason text,
  -- Stamped by the sweep when the clock runs out unpaid. A column rather than
  -- a `now() > payment_due_at` comparison because "this booking was flagged,
  -- and everyone was told" is a different fact from "this booking's deadline
  -- is in the past", and only the first one justifies a cancellation.
  add column if not exists payment_overdue_at         timestamptz,
  -- Stamped when the escrow funds. Closes the clock permanently: every sweep
  -- and every chase action checks it, so a late webhook cannot be overtaken by
  -- a reminder for money that is already in.
  add column if not exists payment_settled_at         timestamptz,
  -- Highest reminder mark already sent, in hours-remaining. The sweep sends
  -- the largest mark still owed, so a job that runs every 15 minutes sends
  -- each reminder exactly once even if it misses a tick.
  add column if not exists last_payment_reminder_hour integer,
  add column if not exists last_payment_nudge_at      timestamptz,
  add column if not exists payment_nudge_count        integer not null default 0;

comment on column public.bookings.payment_due_at is
  'When escrow funding is due. Snapshotted when the window opens, clamped to the start of the event, and never recomputed from settings afterwards.';
comment on column public.bookings.payment_due_override_at is
  'An admin''s per-booking extension. When set, this is the deadline in force and payment_due_at is kept as the original for the record.';
comment on column public.bookings.payment_settled_at is
  'When the escrow funded. Non-null closes the payment window permanently.';

-- The deadline actually in force, in one place. Every sweep, every RPC and the
-- admin projection read this rather than re-deciding the precedence between
-- the original and the override — three copies of that rule is three chances
-- to chase a client an admin has already given more time.
create or replace function public.booking_payment_deadline(b public.bookings)
returns timestamptz language sql immutable set search_path = public as $$
  select coalesce(b.payment_due_override_at, b.payment_due_at);
$$;

comment on function public.booking_payment_deadline(public.bookings) is
  'The payment deadline in force for a booking: the admin override when one exists, otherwise the original computed deadline.';

grant execute on function public.booking_payment_deadline(public.bookings) to authenticated;

-- An extension has to extend. Written as a table check because it is a
-- statement about the booking that must hold whatever wrote the row — an
-- "extension" that shortens the window is a cancellation with better PR.
alter table public.bookings
  drop constraint if exists ck_bookings_payment_override_extends;
alter table public.bookings
  add constraint ck_bookings_payment_override_extends check (
    payment_due_override_at is null
    or payment_due_at is null
    or payment_due_override_at > payment_due_at
  );

-- The sweeps are the only wide reads of this table, and both of them want the
-- same narrow slice: escrow bookings with a live, unpaid clock. Partial
-- indexes keep them off a full scan of every booking ever made.
create index if not exists ix_bookings_payment_due
  on public.bookings(payment_due_at)
  where payment_type = 'escrow'
    and status = 'confirmed'
    and payment_settled_at is null
    and payment_due_at is not null;

create index if not exists ix_bookings_payment_overdue
  on public.bookings(payment_overdue_at)
  where payment_overdue_at is not null and payment_settled_at is null;

-- ---------------------------------------------------------------------
-- The trail.
--
-- Append-only and shown to all three parties unchanged. A vendor whose date
-- was released is entitled to see that the client was reminded three times
-- before it happened; a client who says nobody told them is answered by the
-- same rows.
-- ---------------------------------------------------------------------
create table if not exists public.booking_payment_events (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind       booking_payment_event_kind not null,
  actor_id   uuid references public.profiles(id),
  -- Which side acted, resolved at write time. Reading it back off the actor
  -- would need a join per row and would be wrong the day an admin acts on
  -- behalf of a party.
  actor_role text not null default 'system'
             check (actor_role in ('vendor', 'client', 'admin', 'system')),
  note       text,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.booking_payment_events is
  'Append-only history of a booking''s payment window: when the clock opened, every reminder and manual chase, any extension, the moment it went overdue, and how it ended.';

create index if not exists ix_booking_payment_events_booking
  on public.booking_payment_events(booking_id, created_at);

-- Triggers. The generic wiring in 0010 ran by introspection at seed time, so
-- tables created afterwards get theirs explicitly or silently go without.
drop trigger if exists trg_append_only on public.booking_payment_events;
create trigger trg_append_only before update or delete on public.booking_payment_events
  for each row execute function public.tg_block_mutations();

-- ---------------------------------------------------------------------
-- RLS.
--
-- Read for the two parties and the desks that oversee them; no write policy at
-- all. Every row here is written by a security-definer RPC that re-checks who
-- is asking, because each one is a step with an order to it — a vendor cannot
-- nudge a booking that is already paid, and nobody may edit a reminder after
-- the fact to change what the client was told.
-- ---------------------------------------------------------------------
alter table public.booking_payment_events enable row level security;
alter table public.booking_payment_events force  row level security;

drop policy if exists booking_payment_events_read on public.booking_payment_events;
create policy booking_payment_events_read on public.booking_payment_events
  for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and (b.client_id = auth.uid()
           or public.is_vendor_owner(b.vendor_id)
           or public.has_permission('bookings.read')
           or public.has_permission('booking.payment.chase'))
  ));
