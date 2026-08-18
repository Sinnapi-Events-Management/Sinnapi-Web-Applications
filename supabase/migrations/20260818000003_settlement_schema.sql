-- =====================================================================
-- Sinnapi — post-event settlement, step 2: schema.
--
-- One aggregate (`settlement_requests`) carrying the whole negotiation, and an
-- append-only stream beside it (`settlement_events`) that every party reads.
--
-- The negotiation is kept off `escrow_transactions` on purpose. That row is the
-- money: amounts snapshotted at funding, guarded by an identity constraint, and
-- read by the ledger, the cron and reconciliation. Threading a three-party
-- conversation with its own clocks and consents through it would put mutable
-- workflow state inside the one record that must not move — and would leave the
-- consents, which are the legally interesting part, as a scatter of nullable
-- columns on a table nobody reads that way.
-- =====================================================================

create table if not exists public.settlement_requests (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  escrow_id     uuid not null references public.escrow_transactions(id) on delete cascade,
  vendor_id     uuid not null references public.vendors(id) on delete cascade,
  client_id     uuid not null references public.profiles(id) on delete cascade,
  currency      text not null references public.currencies(code) default 'UGX',

  -- ---------- the ask ----------
  -- What the vendor is still owed at the moment they asked: the balance
  -- tranche, plus the advance if it never went out. Derived server-side from
  -- the escrow — never accepted from the caller — and frozen here so the
  -- figure all three parties consented to survives any later re-pricing.
  requested_amount numeric(14,2) not null check (requested_amount >= 0),
  vendor_note      text,
  requested_by     uuid references public.profiles(id),
  requested_at     timestamptz not null default now(),
  -- When an admin should have put this to the client by. Missing it escalates
  -- in the console; it never auto-advances, because the client has not been
  -- asked anything yet and silence from an admin is not consent from anyone.
  admin_due_at     timestamptz,

  -- ---------- the admin putting it to the client ----------
  forwarded_by  uuid references public.profiles(id),
  forwarded_at  timestamptz,
  admin_note    text,
  client_due_at timestamptz,

  -- ---------- the client's decision ----------
  decision         settlement_decision,
  -- What the client agreed to pay of `requested_amount`. Equal to it on a full
  -- approval; strictly less on a reduction, and never more — an escrow can only
  -- ever pay out what it holds.
  approved_amount  numeric(14,2) check (approved_amount is null or approved_amount >= 0),
  decision_reason  text,
  decided_by       uuid references public.profiles(id),
  decided_at       timestamptz,
  -- True when the client's clock ran out and the request was handed to Finance
  -- as a full-amount release. Kept as a flag rather than inferred from a null
  -- `decided_by`: "the client approved this" and "nobody answered and the
  -- platform did not hold the vendor's money hostage over it" are different
  -- sentences, and the vendor is entitled to know which one applies.
  decided_automatically boolean not null default false,
  -- The client's explicit consent to the figure, separate from the decision
  -- itself. The dialog cannot submit without it.
  client_consent_at     timestamptz,

  -- ---------- the vendor's answer to a reduction ----------
  vendor_response      settlement_vendor_response,
  vendor_response_note text,
  vendor_responded_at  timestamptz,
  vendor_due_at        timestamptz,
  vendor_consent_at    timestamptz,

  -- ---------- outcome ----------
  status       settlement_request_status not null default 'vendor_requested',
  released_by  uuid references public.profiles(id),
  released_at  timestamptz,
  payout_id    uuid references public.payouts(id),
  -- Raised for the withheld part of a reduced settlement, so the money the
  -- vendor is not getting goes back to the client rather than sitting in the
  -- held pool with nobody's name on it.
  refund_id    uuid references public.refunds(id),
  dispute_id   uuid references public.disputes(id),
  cancel_reason text,

  -- ---------- chasing ----------
  last_nudge_at timestamptz,
  nudge_count   integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A client cannot approve more than was asked for, and a reduction has to be
  -- an actual reduction. Written as a table check because both are statements
  -- about money that must hold whatever wrote the row.
  constraint ck_settlement_amount check (
    approved_amount is null or approved_amount <= requested_amount),
  constraint ck_settlement_decision_shape check (
    decision is null
    or (decision = 'full'    and approved_amount = requested_amount)
    or (decision = 'reduced' and approved_amount < requested_amount
        and coalesce(btrim(decision_reason), '') <> '')
  )
);

comment on table public.settlement_requests is
  'A vendor''s post-event request for the money held for them, and the three-party agreement on what is actually paid. One live request per booking.';
comment on column public.settlement_requests.requested_amount is
  'Vendor''s remaining entitlement when the request was raised: balance tranche plus the advance if it had not yet been released. Snapshotted, never recomputed.';
comment on column public.settlement_requests.approved_amount is
  'The figure every party consented to. requested_amount - approved_amount is refunded to the client.';

-- One live request per booking. A cancelled or contested one does not block a
-- fresh attempt — the first is history, and the vendor may well need to ask
-- again once the dispute behind it is settled.
create unique index if not exists ux_settlement_open_per_booking
  on public.settlement_requests(booking_id)
  where status in ('vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent', 'consented');

create index if not exists ix_settlement_status   on public.settlement_requests(status);
create index if not exists ix_settlement_vendor   on public.settlement_requests(vendor_id, status);
create index if not exists ix_settlement_client   on public.settlement_requests(client_id, status);
create index if not exists ix_settlement_escrow   on public.settlement_requests(escrow_id);
-- The cron sweeps by whichever clock is running, so each gets a partial index
-- rather than one wide scan of every request ever made.
create index if not exists ix_settlement_admin_due
  on public.settlement_requests(admin_due_at)  where status = 'vendor_requested';
create index if not exists ix_settlement_client_due
  on public.settlement_requests(client_due_at) where status = 'admin_forwarded';
create index if not exists ix_settlement_vendor_due
  on public.settlement_requests(vendor_due_at) where status = 'awaiting_vendor_consent';

-- ---------------------------------------------------------------------
-- The visible trail.
--
-- Append-only and shown to all three parties unchanged. Half of what makes a
-- flow like this defensible is that nobody can quietly rewrite what was said:
-- the reduction, the reason given for it, who chased whom and when.
-- ---------------------------------------------------------------------
create table if not exists public.settlement_events (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.settlement_requests(id) on delete cascade,
  kind       settlement_event_kind not null,
  actor_id   uuid references public.profiles(id),
  -- Which side acted, resolved at write time. Reading it back off the actor
  -- would need a join per row and would be wrong the day an admin acts on
  -- behalf of a party.
  actor_role text not null default 'system'
             check (actor_role in ('vendor', 'client', 'admin', 'system')),
  amount     numeric(14,2),
  note       text,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ix_settlement_events_request
  on public.settlement_events(request_id, created_at);

-- ---------------------------------------------------------------------
-- Triggers. The generic wiring in 0010 ran by introspection at seed time, so
-- tables created afterwards get theirs explicitly or silently go without.
-- ---------------------------------------------------------------------
drop trigger if exists trg_updated_at on public.settlement_requests;
create trigger trg_updated_at before update on public.settlement_requests
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_audit_log on public.settlement_requests;
create trigger trg_audit_log after insert or update or delete on public.settlement_requests
  for each row execute function public.tg_write_audit();

drop trigger if exists trg_append_only on public.settlement_events;
create trigger trg_append_only before update or delete on public.settlement_events
  for each row execute function public.tg_block_mutations();

-- ---------------------------------------------------------------------
-- RLS.
--
-- Read for the three parties; no write policy at all. Every mutation goes
-- through a security-definer RPC that re-checks who is asking, because each
-- one is a step in a negotiation with an order to it — a client cannot decide
-- on a request no admin has put to them, and neither party may edit a consent
-- after the fact.
-- ---------------------------------------------------------------------
alter table public.settlement_requests enable row level security;
alter table public.settlement_requests force  row level security;
alter table public.settlement_events   enable row level security;
alter table public.settlement_events   force  row level security;

drop policy if exists settlement_requests_read on public.settlement_requests;
create policy settlement_requests_read on public.settlement_requests for select to authenticated
  using (client_id = auth.uid()
         or public.is_vendor_owner(vendor_id)
         or public.has_permission('settlement.manage')
         or public.has_permission('escrow.read'));

drop policy if exists settlement_events_read on public.settlement_events;
create policy settlement_events_read on public.settlement_events for select to authenticated
  using (exists (select 1 from public.settlement_requests r
                 where r.id = request_id
                   and (r.client_id = auth.uid()
                        or public.is_vendor_owner(r.vendor_id)
                        or public.has_permission('settlement.manage')
                        or public.has_permission('escrow.read'))));

-- ---------------------------------------------------------------------
-- Realtime. Three people watch this flow at once and each acts on what the
-- others just did; a page that needs a refresh to show the client's decision
-- is how a vendor ends up chasing an answer they already have.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select unnest(array['settlement_requests', 'settlement_events']) as t
  loop
    execute format('alter table public.%I replica identity full;', r.t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = r.t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', r.t);
    end if;
  end loop;
end$$;
