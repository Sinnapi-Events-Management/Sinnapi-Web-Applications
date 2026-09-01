-- =====================================================================
-- Sinnapi — 0901b EVENT PLANNING: what an event needs, and what answers it
--
-- Two changes. A table saying what the event still has to source, priced per
-- service type; and one column on `quotations` and `bookings` saying which of
-- those lines a quote or a booking is against.
--
-- WHY A REQUIREMENT TABLE RATHER THAN ONE POT
-- "Am I over budget" is answerable from `events.budget_max` alone, and it is
-- the least useful moment to answer it — the client is already committed. The
-- question worth answering is "can I still afford a photographer", and that
-- needs the budget broken down the way a client actually holds it: catering so
-- much, decor so much, and a remainder they have not spent yet.
--
-- It is also what makes recommendation possible. A gap the platform can name —
-- "no vendor on Decor, 3m unspent" — is a gap it can fill; without lines, the
-- best it could do is recommend vendors for an event in general.
--
-- WHY THE STATE OF A LINE IS NOT STORED
-- A requirement is open, being sourced, or booked entirely according to the
-- quotations and bookings pointing at it. Storing that as a column means a
-- trigger on two other tables keeping it true, and a status that silently goes
-- stale the first time one of those paths is added without remembering this
-- one. It is derived in `event_requirement_summary` (0901c) instead.
--
-- The one thing that is NOT derivable is the client changing their mind — "we
-- are not hiring a videographer after all" — because that is a fact about
-- intent and no quotation records it. So exactly that is stored, as
-- `cancelled_at`, and nothing else.
-- =====================================================================

-- ---------------------------------------------------------------------
-- EVENT REQUIREMENTS
--
-- ONE LINE PER CATEGORY PER EVENT. A client who wants two photographers is
-- describing one requirement with a bigger allocation, not two lines — and the
-- unique constraint is what lets a recommendation say "you have no vendor for
-- Decor" without first working out which of three Decor lines it meant.
--
-- `allocated_amount` is nullable, and null is not zero. Null means the client
-- has named a category they need without deciding what to spend on it, which is
-- how planning normally starts; zero would mean they have decided it is free.
-- The rollups keep the two apart, and `unallocated` on the event summary is the
-- budget left over once the named lines are subtracted.
--
-- `currency` is denormalised from the event rather than joined on every read.
-- It is stamped by the trigger below and never by a caller, so it cannot drift:
-- an allocation is a slice of one budget and has no business being in another
-- currency than the budget it is a slice of. `fx_convert` exists for the money
-- arriving from vendors, which genuinely can be in anything.
-- ---------------------------------------------------------------------
create table if not exists public.event_requirements (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events(id) on delete cascade,
  category_id      uuid not null references public.service_categories(id),

  -- What the client calls this line. Null falls back to the category's own
  -- name, which is right for most lines — "Catering" needs no elaboration —
  -- and lets the ones that do say "Catering (300 guests, halal)".
  title            text check (title is null or length(btrim(title)) between 1 and 120),

  -- The brief for this line, and the only part of a requirement a vendor is
  -- ever shown. It seeds the quotation request on an invitation, so a vendor
  -- reads what they are being asked to price rather than the whole event.
  brief            text check (brief is null or length(brief) <= 2000),

  allocated_amount numeric(14,2) check (allocated_amount is null or allocated_amount >= 0),
  currency         text references public.currencies(code),

  priority         requirement_priority not null default 'must_have',

  -- The client's decision that this line is no longer wanted. A cancelled line
  -- keeps its history — the quotes and bookings against it still exist and
  -- still count against the budget if they were committed — but it stops being
  -- a gap to recommend into and stops claiming its allocation.
  cancelled_at     timestamptz,
  cancelled_by     uuid references public.profiles(id),

  sort_order       integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references public.profiles(id),
  updated_by       uuid references public.profiles(id),
  deleted_at       timestamptz,
  deleted_by       uuid references public.profiles(id),
  version          integer not null default 1
);

-- Partial on `deleted_at` so a soft-deleted line does not block the client
-- re-adding the category they just removed — the soft-delete trigger (0010)
-- routes DELETE to an update, so without this the row would still be there.
create unique index if not exists ux_event_requirements_category
  on public.event_requirements(event_id, category_id)
  where deleted_at is null;

create index if not exists ix_event_requirements_event
  on public.event_requirements(event_id, sort_order)
  where deleted_at is null;

create index if not exists ix_event_requirements_category
  on public.event_requirements(category_id)
  where deleted_at is null and cancelled_at is null;

comment on table public.event_requirements is
  'One service type an event needs, with the slice of the budget the client has set aside for it. '
  'State (open / sourcing / booked) is derived from the quotations and bookings pointing at it, '
  'never stored; only the client cancelling a line is recorded.';

-- ---------------------------------------------------------------------
-- The requirement's currency is the event's, always.
--
-- BEFORE INSERT OR UPDATE rather than a column default, because the value comes
-- from another table. It overwrites rather than fills a gap: a caller supplying
-- a different currency is not expressing a preference, they are describing a
-- slice of a budget in units the budget is not in.
-- ---------------------------------------------------------------------
create or replace function public.tg_event_requirement_currency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(e.currency, 'UGX') into new.currency
    from public.events e where e.id = new.event_id;
  return new;
end;
$$;

drop trigger if exists trg_event_requirement_currency on public.event_requirements;
create trigger trg_event_requirement_currency
  before insert or update of event_id on public.event_requirements
  for each row execute function public.tg_event_requirement_currency();

-- ---------------------------------------------------------------------
-- The generic triggers from 0010 were applied by introspecting the tables that
-- existed then, so a table added later gets its own copies. Same four, same
-- order, same semantics.
-- ---------------------------------------------------------------------
drop trigger if exists trg_updated_at on public.event_requirements;
create trigger trg_updated_at before update on public.event_requirements
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_bump_version on public.event_requirements;
create trigger trg_bump_version before update on public.event_requirements
  for each row execute function public.tg_bump_version();

drop trigger if exists trg_audit_actor on public.event_requirements;
create trigger trg_audit_actor before insert or update on public.event_requirements
  for each row execute function public.tg_set_audit_actor();

drop trigger if exists trg_soft_delete on public.event_requirements;
create trigger trg_soft_delete before delete on public.event_requirements
  for each row execute function public.tg_soft_delete();

-- =====================================================================
-- WHICH LINE A QUOTE OR A BOOKING IS AGAINST
--
-- Nullable, and it stays nullable. Every quotation and booking made before this
-- migration has no requirement, and so does every one made the old way — a
-- client who requests a quote from a vendor's profile without going through an
-- event is doing something the product still supports. Null means "counts
-- against the event as a whole", which is exactly how the rollups treat it.
--
-- `on delete set null` rather than cascade: deleting a budget line must never
-- delete a booking. The commitment outlives the plan it was made under.
-- =====================================================================
alter table public.quotations
  add column if not exists requirement_id uuid references public.event_requirements(id) on delete set null;

alter table public.bookings
  add column if not exists requirement_id uuid references public.event_requirements(id) on delete set null;

create index if not exists ix_quotations_requirement
  on public.quotations(requirement_id) where requirement_id is not null;

create index if not exists ix_bookings_requirement
  on public.bookings(requirement_id) where requirement_id is not null;

-- The rollups in 0901c sum bookings and quotations by event; both tables have
-- had an index on `event_id` only for quotations (`ix_quotations_event`).
-- Bookings had none, so every budget read would have been a sequential scan of
-- the whole table.
create index if not exists ix_bookings_event
  on public.bookings(event_id) where event_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------
-- A requirement must belong to the same event as the row citing it.
--
-- Not expressible as a foreign key — it is a two-column agreement across three
-- tables — and not safe to leave to the RPCs, because `quotations` and
-- `bookings` are both directly writable through PostgREST by the parties to
-- them (see `quotations_update`, `bookings` policies in 0011). Without this, a
-- client could point their booking at another event's budget line and have the
-- amount subtracted from a stranger's budget.
--
-- Null on either side is fine: no requirement, or a requirement on a row with
-- no event, are both "counts against nothing in particular".
-- ---------------------------------------------------------------------
create or replace function public.tg_requirement_matches_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_event uuid;
begin
  if new.requirement_id is null then return new; end if;

  select r.event_id into v_event
    from public.event_requirements r where r.id = new.requirement_id;

  if v_event is null then raise exception 'requirement_not_found'; end if;
  if new.event_id is distinct from v_event then
    raise exception 'requirement_event_mismatch';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_requirement_matches_event on public.quotations;
create trigger trg_requirement_matches_event
  before insert or update of requirement_id, event_id on public.quotations
  for each row execute function public.tg_requirement_matches_event();

drop trigger if exists trg_requirement_matches_event on public.bookings;
create trigger trg_requirement_matches_event
  before insert or update of requirement_id, event_id on public.bookings
  for each row execute function public.tg_requirement_matches_event();

-- ---------------------------------------------------------------------
-- BUDGET DECISION TRAIL
--
-- Append-only record of every time the client was told they were over budget
-- and went ahead. The override in 0901e is a real decision with money attached,
-- and "the client agreed to go 3.2m over on 4 June" is the kind of fact that a
-- dispute six months later turns on. `bookings.amount` alone cannot say it —
-- by then the budget may have been raised.
--
-- Also the honest place to answer "how often does the guard get overridden",
-- which is the question that decides whether the threshold is set right.
-- ---------------------------------------------------------------------
create table if not exists public.event_budget_overrides (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  requirement_id uuid references public.event_requirements(id) on delete set null,
  quotation_id   uuid references public.quotations(id) on delete set null,
  booking_id     uuid references public.bookings(id) on delete set null,
  actor_id       uuid references public.profiles(id),

  -- All in the event's currency, converted at the moment of the decision. Kept
  -- as figures rather than recomputed later because the rate moves and the
  -- budget can be edited — the record has to say what the client was actually
  -- looking at when they agreed.
  currency       text not null references public.currencies(code),
  budget_amount  numeric(14,2),
  committed_before numeric(14,2) not null,
  attempted_amount numeric(14,2) not null,
  over_by        numeric(14,2) not null,

  occurred_at    timestamptz not null default now()
);

create index if not exists ix_event_budget_overrides_event
  on public.event_budget_overrides(event_id, occurred_at desc);

comment on table public.event_budget_overrides is
  'Append-only: the client was shown an over-budget warning and committed anyway. Figures are '
  'snapshotted in the event currency at the moment of the decision, because the rate moves and '
  'the budget can be edited afterwards.';

-- Append-only for real, using the guard 0010 established for ledgers and event
-- streams. A decision trail that can be edited is not a trail.
drop trigger if exists trg_append_only on public.event_budget_overrides;
create trigger trg_append_only before update or delete on public.event_budget_overrides
  for each row execute function public.tg_block_mutations();
