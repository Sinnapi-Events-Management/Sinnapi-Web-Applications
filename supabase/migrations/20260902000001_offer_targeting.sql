-- =====================================================================
-- Sinnapi — 0902a Offers: what a promotion or a discount is actually FOR
--
-- WHAT WAS BROKEN
-- `promotions` and `discounts` shipped in 0008 and have been a write-only
-- island ever since. Everything below is verified against the tree, not
-- assumed:
--
--   * The only reader of either table anywhere in the monorepo is the vendor
--     portal's own two screens. No client, admin or public surface has ever
--     selected a promotion or a discount.
--   * `discount_redemptions` has never had a writer. Not one RPC in
--     `supabase/migrations` inserts into it, so `discounts.used_count` has been
--     zero on every row since the table was created and `max_uses` has never
--     capped anything.
--   * Nothing connects an offer to what it is an offer ON. A vendor can
--     publish "20% off" and the platform cannot say twenty percent off WHAT.
--     `send_quotation` takes a `p_discount_rate` the vendor types by hand and
--     has no idea the `discounts` table exists.
--
-- The net effect is that a vendor could author a campaign, and that was all.
--
-- WHAT THIS MIGRATION CHANGES IT INTO
-- An offer becomes a TARGETED claim about a specific thing a client can buy.
-- Three levels, matching the three levels a vendor actually sells at:
--
--   vendor_service   "10% off everything under my Videography service"
--     └─ package     "15% off the Wedding Photography package"
--          └─ tier   "20% off the Gold tier of Wedding Photography"
--
-- One target table serves both `promotions` and `discounts`, because the
-- resolution question — does this offer apply to this package and tier — has
-- exactly one right answer and must not be written twice.
--
-- INHERITANCE, AND WHY IT IS ONE-WAY
-- A discount with no targets of its own inherits its promotion's. That is the
-- shape a real campaign has: "Festive Season" covers four packages, and two
-- codes live under it. Making the vendor re-pick the same four packages on
-- each code is how the code and the campaign end up disagreeing about what the
-- sale covers. Inheritance never runs the other way — a code narrowing itself
-- to one of the campaign's packages is a normal thing to want, and a campaign
-- silently widening to whatever its codes point at is not.
--
-- AN OFFER WITH NO TARGETS AT ALL
-- Applies to everything the vendor sells. That is the legacy shape — every row
-- in the table today has no targets and no way to have acquired any — and
-- deleting those vendors' live discounts to enforce a new rule would be this
-- migration breaking working data to tidy a model. New offers are required to
-- name a target by the vendor portal's form, which is where the requirement
-- belongs: it is a product rule about authoring, not a truth about the column.
--
-- WHERE THE DISCOUNT LANDS IN THE PRICE
-- On the tier's NET, after the tier's own `discount_rate`. A client reading a
-- package card sees the tier's net as the price; "20% off this package" means
-- twenty percent off the number they are looking at. Applying it to the gross
-- instead would quote a saving the client cannot reconcile with the card, and
-- applying it before the tier rate would make the two orderings differ by
-- rounding for no reason a client could ever be told.
--
-- 0902b resolves offers and prices them. 0902c redeems them. 0902d moderates
-- them. This file is the shape only.
-- =====================================================================

-- ---------------------------------------------------------------------
-- THE TARGET KIND
--
-- An enum rather than three nullable columns interpreted by whichever is set,
-- because "which of these is the real one" is a question every reader would
-- otherwise have to answer for itself, and a row with two set is unreadable
-- rather than merely wrong. The check constraint below pins the columns to the
-- kind, so the enum and the data can never disagree.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'offer_target_kind') then
    create type public.offer_target_kind as enum ('package', 'package_tier', 'vendor_service');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- OFFER_TARGETS
--
-- `on delete cascade` on every reference on purpose. A target is a statement
-- about a thing; when the thing is gone the statement is not "an offer on
-- nothing", it is noise that would make `offer_targets` non-empty for an offer
-- whose real scope is now smaller than the vendor set. Cascading keeps the
-- inheritance rule honest: an offer whose last target was deleted falls back to
-- vendor-wide, which is the same place a brand-new offer starts.
-- ---------------------------------------------------------------------
create table if not exists public.offer_targets (
  id                uuid primary key default gen_random_uuid(),

  -- Exactly one owner. Both nullable at the column level and constrained to
  -- one-of below, rather than a polymorphic (owner_type, owner_id) pair, so
  -- that both sides keep a real foreign key and a real cascade.
  promotion_id      uuid references public.promotions(id) on delete cascade,
  discount_id       uuid references public.discounts(id)  on delete cascade,

  kind              public.offer_target_kind not null,

  package_id        uuid references public.quote_templates(id)      on delete cascade,
  tier_id           uuid references public.quote_template_tiers(id) on delete cascade,
  vendor_service_id uuid references public.vendor_services(id)      on delete cascade,

  created_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id),

  constraint ck_offer_target_owner check (
    (promotion_id is not null)::int + (discount_id is not null)::int = 1),

  constraint ck_offer_target_shape check (
    case kind
      when 'package'        then package_id is not null
                             and tier_id is null
                             and vendor_service_id is null
      when 'package_tier'   then package_id is not null
                             and tier_id is not null
                             and vendor_service_id is null
      when 'vendor_service' then vendor_service_id is not null
                             and package_id is null
                             and tier_id is null
    end)
);

comment on table public.offer_targets is
  'What a promotion or a discount applies to: a vendor service, a package, or one tier of a package. '
  'An offer with no rows here applies to everything the vendor sells.';

-- The nil UUID stands in for "no tier" / "no package" so a repeated target is
-- one row rather than two. `nulls not distinct` would say this more directly
-- but is Postgres 15+, and this schema does not pin a server version.
create unique index if not exists ux_offer_target_promotion
  on public.offer_targets(
       promotion_id, kind,
       coalesce(package_id,        '00000000-0000-0000-0000-000000000000'::uuid),
       coalesce(tier_id,           '00000000-0000-0000-0000-000000000000'::uuid),
       coalesce(vendor_service_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where promotion_id is not null;

create unique index if not exists ux_offer_target_discount
  on public.offer_targets(
       discount_id, kind,
       coalesce(package_id,        '00000000-0000-0000-0000-000000000000'::uuid),
       coalesce(tier_id,           '00000000-0000-0000-0000-000000000000'::uuid),
       coalesce(vendor_service_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where discount_id is not null;

-- The resolution query runs the other way — "which offers cover this package" —
-- on every package card the platform renders, so it gets its own indexes.
create index if not exists ix_offer_targets_package on public.offer_targets(package_id)
  where package_id is not null;
create index if not exists ix_offer_targets_tier    on public.offer_targets(tier_id)
  where tier_id is not null;
create index if not exists ix_offer_targets_service on public.offer_targets(vendor_service_id)
  where vendor_service_id is not null;
create index if not exists ix_offer_targets_promotion on public.offer_targets(promotion_id)
  where promotion_id is not null;
create index if not exists ix_offer_targets_discount  on public.offer_targets(discount_id)
  where discount_id is not null;

-- ---------------------------------------------------------------------
-- THE OWNERSHIP GUARD
--
-- A target must belong to the same vendor as the offer that names it.
-- `offer_targets` is reachable through PostgREST and its write policy can only
-- ask "do you own the offer" — it cannot see the package on the other side of
-- the row. Without this trigger a vendor could attach their own promotion to a
-- competitor's package and have "20% off" render on that competitor's card.
--
-- Platform-wide discounts (`vendor_id is null`, which the column has always
-- allowed) may target anything: they are written by an operator holding
-- `discounts.manage`, not by a vendor.
-- ---------------------------------------------------------------------
create or replace function public.tg_offer_target_same_vendor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_offer_vendor  uuid;
  v_target_vendor uuid;
begin
  if new.promotion_id is not null then
    select p.vendor_id into v_offer_vendor
      from public.promotions p where p.id = new.promotion_id;
  else
    select d.vendor_id into v_offer_vendor
      from public.discounts d where d.id = new.discount_id;
  end if;

  if new.package_id is not null then
    select t.vendor_id into v_target_vendor
      from public.quote_templates t where t.id = new.package_id;
  else
    select s.vendor_id into v_target_vendor
      from public.vendor_services s where s.id = new.vendor_service_id;
  end if;

  if v_target_vendor is null then raise exception 'offer_target_not_found'; end if;

  -- A tier must be a tier OF the named package, or "the Gold tier" on the card
  -- would be some other package's Gold.
  if new.tier_id is not null
     and not exists (select 1 from public.quote_template_tiers ti
                      where ti.id = new.tier_id and ti.template_id = new.package_id) then
    raise exception 'tier_not_in_package';
  end if;

  -- Null offer vendor = platform-wide. Nothing to match against.
  if v_offer_vendor is not null and v_offer_vendor <> v_target_vendor then
    raise exception 'offer_target_vendor_mismatch';
  end if;

  return new;
end;$$;

drop trigger if exists trg_offer_target_same_vendor on public.offer_targets;
create trigger trg_offer_target_same_vendor
  before insert or update on public.offer_targets
  for each row execute function public.tg_offer_target_same_vendor();

-- ---------------------------------------------------------------------
-- WHAT A DISCOUNT NEEDS TO BE READABLE BY A CLIENT
--
-- Every column here exists because a client-facing card cannot be drawn
-- without it. `discounts` was designed as an internal coupon record: it has a
-- code, a type and a value, and no way to say what the offer IS.
-- ---------------------------------------------------------------------
alter table public.discounts
  -- The headline. "EARLY-BIRD" is a code, not a name, and a card whose title
  -- is a code reads as a voucher a client has to already know about.
  add column if not exists title       text,
  add column if not exists description text,

  -- The fine print, shown under the price on the client's confirmation. A
  -- saving with unstated conditions is the single largest source of complaint
  -- on a discounted booking.
  add column if not exists terms       text,

  -- A ceiling on what a percentage can take off. "20% off, up to UGX 500,000"
  -- is how a vendor offers a real discount on a small booking without writing
  -- a blank cheque on a large one. Null = uncapped, which is today's behaviour.
  add column if not exists max_discount_amount numeric(14,2),

  -- Per-client cap, separate from `max_uses`. Without it one client can burn a
  -- hundred-use campaign on a hundred bookings, which is the failure mode of
  -- every uncapped promotion. Null = no per-client limit.
  add column if not exists max_per_client integer,

  -- Auto-applied offers have no code and need none: the client sees the price
  -- already reduced on the card. Derived from `code is null` today, stored
  -- explicitly because a vendor may want a named code that ALSO applies
  -- automatically to anyone who never types it.
  add column if not exists is_automatic boolean not null default false,

  -- Moderation. Separate from `is_active` so a vendor flipping their own pause
  -- back on cannot undo an operator's decision — the same split
  -- `quote_templates.admin_unpublished_at` uses, for the same reason.
  add column if not exists admin_suspended_at     timestamptz,
  add column if not exists admin_suspended_by     uuid references public.profiles(id),
  add column if not exists admin_suspended_reason text;

alter table public.discounts
  drop constraint if exists ck_discounts_max_discount_amount;
alter table public.discounts
  add constraint ck_discounts_max_discount_amount
  check (max_discount_amount is null or max_discount_amount > 0);

alter table public.discounts
  drop constraint if exists ck_discounts_max_per_client;
alter table public.discounts
  add constraint ck_discounts_max_per_client
  check (max_per_client is null or max_per_client >= 1);

-- A percentage over 100 pays the client to book. The vendor portal has always
-- refused it in the form; the column never has, and this table is reachable
-- through PostgREST.
alter table public.discounts
  drop constraint if exists ck_discounts_percentage_bound;
alter table public.discounts
  add constraint ck_discounts_percentage_bound
  check (type <> 'percentage' or value <= 100);

-- Backfill: a code with no title is titled by its code, so no existing row
-- renders a nameless card. Automatic is set from the absence of a code, which
-- is what the column meant implicitly before it existed.
update public.discounts
   set title = coalesce(title, code, 'Special offer'),
       is_automatic = (code is null)
 where title is null;

-- ---------------------------------------------------------------------
-- WHAT A PROMOTION NEEDS
-- ---------------------------------------------------------------------
alter table public.promotions
  add column if not exists terms text,

  -- Operator-controlled placement on the public offers directory. This is the
  -- console's positive action on a campaign; suspension is its negative one,
  -- and a moderation surface with only a punishment is a surface nobody opens.
  add column if not exists featured_at timestamptz,
  add column if not exists featured_by uuid references public.profiles(id),

  add column if not exists admin_suspended_at     timestamptz,
  add column if not exists admin_suspended_by     uuid references public.profiles(id),
  add column if not exists admin_suspended_reason text;

-- The public listing predicate, in the order the planner should test it.
create index if not exists ix_promotions_live
  on public.promotions(ends_at)
  where is_active and deleted_at is null and admin_suspended_at is null;

create index if not exists ix_discounts_live
  on public.discounts(vendor_id, ends_at)
  where is_active and deleted_at is null and admin_suspended_at is null;

create index if not exists ix_promotions_featured
  on public.promotions(featured_at desc)
  where featured_at is not null and is_active and deleted_at is null
    and admin_suspended_at is null;

-- ---------------------------------------------------------------------
-- TRIGGERS
--
-- The generic wiring in 0010 ran by introspection at seed time, so a table
-- created afterwards gets its own or silently goes without.
-- ---------------------------------------------------------------------
drop trigger if exists trg_audit_log on public.offer_targets;
create trigger trg_audit_log after insert or update or delete on public.offer_targets
  for each row execute function public.tg_write_audit();

-- ---------------------------------------------------------------------
-- IS THIS OFFER LIVE?
--
-- One predicate, called from the read policies, the resolution RPCs in 0902b
-- and the redemption path in 0902c. Written once because "live" has five
-- clauses and a surface that forgets one of them shows a client an offer that
-- the redemption path will then refuse — which is worse than never showing it.
--
-- `used_count` is deliberately NOT tested here. A campaign that has hit its cap
-- is still a live campaign whose remaining uses are zero, and the difference
-- matters: the client is told "this offer is fully claimed", not shown nothing
-- and left to wonder where the price on the card went. 0902b surfaces
-- exhaustion as its own state.
-- ---------------------------------------------------------------------
create or replace function public.promotion_is_live(p_promotion_id uuid, p_at timestamptz default now())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.promotions p
     where p.id = p_promotion_id
       and p.is_active
       and p.deleted_at is null
       and p.admin_suspended_at is null
       and p.starts_at <= p_at
       and p.ends_at   >= p_at
       and (p.vendor_id is null or public.vendor_is_public(p.vendor_id))
  );
$$;

create or replace function public.discount_is_live(p_discount_id uuid, p_at timestamptz default now())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.discounts d
     where d.id = p_discount_id
       and d.is_active
       and d.deleted_at is null
       and d.admin_suspended_at is null
       and d.starts_at <= p_at
       and d.ends_at   >= p_at
       and (d.vendor_id is null or public.vendor_is_public(d.vendor_id))
       -- A code under a suspended or expired campaign is off. The campaign is
       -- the thing the vendor paused; the codes under it are how it reaches
       -- money, and leaving them live would make pausing a campaign cosmetic.
       and (d.promotion_id is null or public.promotion_is_live(d.promotion_id, p_at))
  );
$$;

comment on function public.discount_is_live(uuid, timestamptz) is
  'Every clause of "this code can be used right now" except its usage cap, which is a separate '
  'state so an exhausted offer can be explained rather than silently vanish.';

-- One target row against one package/tier. Split out so the three call sites in
-- the function above read as the rule rather than as three copies of it.
create or replace function public._offer_target_matches(
  t            public.offer_targets,
  p_package_id uuid,
  p_tier_id    uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case t.kind
    when 'package'      then t.package_id = p_package_id
    -- A tier target matches the package when no tier was asked about, and only
    -- its own tier when one was.
    when 'package_tier' then t.package_id = p_package_id
                         and (p_tier_id is null or t.tier_id = p_tier_id)
    when 'vendor_service' then exists (
      select 1 from public.quote_templates q
       where q.id = p_package_id
         and q.vendor_service_id is not null
         and q.vendor_service_id = t.vendor_service_id)
  end;
$$;

-- ---------------------------------------------------------------------
-- DOES THIS OFFER COVER THIS PACKAGE AND TIER?
--
-- The inheritance rule, in SQL, once.
--
--   1. The discount's own targets, if it has any.
--   2. Otherwise its promotion's targets, if it has a promotion with any.
--   3. Otherwise everything the vendor sells.
--
-- A `vendor_service` target matches a package through
-- `quote_templates.vendor_service_id`. A package whose service link is null
-- does not match a service target — correctly: the vendor never said which
-- service it belongs to, and guessing would put a sale on a package the vendor
-- did not choose.
--
-- `p_tier_id` null asks the weaker question "does this offer touch the package
-- at all", which is what a card badge needs before a tier is chosen. A
-- `package_tier` target answers yes to that and no to the other tiers, so a
-- badge appears on a package with a tier-scoped offer and the price only moves
-- on the tier it names.
-- ---------------------------------------------------------------------
create or replace function public.offer_targets_package(
  p_promotion_id uuid,
  p_discount_id  uuid,
  p_package_id   uuid,
  p_tier_id      uuid default null)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_owner_promotion uuid := p_promotion_id;
  v_has_own boolean;
begin
  if p_package_id is null then return false; end if;

  if p_discount_id is not null then
    select exists (select 1 from public.offer_targets t where t.discount_id = p_discount_id)
      into v_has_own;

    if v_has_own then
      return exists (
        select 1 from public.offer_targets t
         where t.discount_id = p_discount_id
           and public._offer_target_matches(t, p_package_id, p_tier_id));
    end if;

    -- No targets of its own: fall through to the campaign it belongs to.
    select d.promotion_id into v_owner_promotion
      from public.discounts d where d.id = p_discount_id;
  end if;

  if v_owner_promotion is null then
    -- Vendor-wide. Every package the vendor sells is covered.
    return true;
  end if;

  select exists (select 1 from public.offer_targets t where t.promotion_id = v_owner_promotion)
    into v_has_own;
  if not v_has_own then return true; end if;

  return exists (
    select 1 from public.offer_targets t
     where t.promotion_id = v_owner_promotion
       and public._offer_target_matches(t, p_package_id, p_tier_id));
end;$$;

comment on function public.offer_targets_package(uuid, uuid, uuid, uuid) is
  'Does this promotion or discount apply to this package (and tier)? Implements the one-way '
  'inheritance: a discount uses its own targets, else its promotion''s, else the whole vendor.';

-- ---------------------------------------------------------------------
-- RLS
--
-- Read follows the offer: a target is visible to anyone who may see the offer
-- that owns it, which is what makes a badge renderable without a second policy
-- deciding visibility a second way.
--
-- `promos_public_read` in 0011 already grants `anon`. `discounts_read` grants
-- only `authenticated`, and it stays that way — a discount row carries `code`,
-- and 0902b is what exposes the redacted teaser to a signed-out visitor. So a
-- discount's targets are readable to `authenticated` only, matching their
-- owner exactly.
--
-- Writes go through the owner. A vendor who may edit the offer may say what it
-- covers; the trigger above is what stops them saying it covers someone else's
-- package.
-- ---------------------------------------------------------------------
alter table public.offer_targets enable row level security;

drop policy if exists offer_targets_read on public.offer_targets;
create policy offer_targets_read on public.offer_targets for select to anon, authenticated
  using (
    (promotion_id is not null and exists (
      select 1 from public.promotions p
       where p.id = promotion_id
         and ((p.is_active and p.deleted_at is null) or public.is_vendor_owner(p.vendor_id))))
    or
    (discount_id is not null and exists (
      select 1 from public.discounts d
       where d.id = discount_id
         and ((d.is_active and d.deleted_at is null and auth.uid() is not null)
              or (d.vendor_id is not null and public.is_vendor_owner(d.vendor_id))
              or public.is_admin())))
  );

drop policy if exists offer_targets_write on public.offer_targets;
create policy offer_targets_write on public.offer_targets for all to authenticated
  using (
    (promotion_id is not null and exists (
      select 1 from public.promotions p
       where p.id = promotion_id and public.is_vendor_owner(p.vendor_id)))
    or
    (discount_id is not null and exists (
      select 1 from public.discounts d
       where d.id = discount_id
         and ((d.vendor_id is not null and public.is_vendor_owner(d.vendor_id))
              or public.has_permission('discounts.manage'))))
  )
  with check (
    (promotion_id is not null and exists (
      select 1 from public.promotions p
       where p.id = promotion_id and public.is_vendor_owner(p.vendor_id)))
    or
    (discount_id is not null and exists (
      select 1 from public.discounts d
       where d.id = discount_id
         and ((d.vendor_id is not null and public.is_vendor_owner(d.vendor_id))
              or public.has_permission('discounts.manage'))))
  );

-- ---------------------------------------------------------------------
-- MODERATION REACHES THE OFFER TABLES
--
-- 0011's `promos_write` and `discounts_write` are vendor-owner only (plus
-- `discounts.manage` on discounts). An operator holding `vendor.manage` could
-- take a package off the market and could not touch the campaign advertising
-- it. The suspension RPCs in 0902d are `security definer` and so bypass RLS,
-- but the console also needs to READ a paused or suspended campaign to act on
-- it, and `promos_public_read` hides one: `is_active` false plus not the owner
-- is invisible today.
-- ---------------------------------------------------------------------
drop policy if exists promos_public_read on public.promotions;
create policy promos_public_read on public.promotions for select to anon, authenticated
  using ((is_active and deleted_at is null)
         or public.is_vendor_owner(vendor_id)
         or public.is_admin());

-- ---------------------------------------------------------------------
-- GRANTS
--
-- The predicates are called from read policies that `anon` is subject to, so
-- `anon` must be able to execute them or a signed-out visitor's every read of
-- a promotion raises instead of returning rows.
-- ---------------------------------------------------------------------
grant execute on function
  public.promotion_is_live(uuid, timestamptz),
  public.discount_is_live(uuid, timestamptz),
  public.offer_targets_package(uuid, uuid, uuid, uuid),
  public._offer_target_matches(public.offer_targets, uuid, uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- THE REDEMPTION LEDGER GROWS A LIFECYCLE
--
-- `discount_redemptions` shipped in 0008 as a flat "it was used" row and has
-- never had a writer. Turning it into the thing that enforces `max_uses`
-- means answering a question the flat shape cannot: when is a use SPENT?
--
--   * At acceptance is too late. The vendor commits the price when they send
--     the quote; if the cap is only checked on the client's answer, two
--     clients can both be quoted the last remaining use and one of them is
--     told at the finish line that the price they agreed to is gone.
--   * At send is too early to be final. Most quotes are never accepted, and a
--     campaign whose uses are burned by quotes nobody took is a campaign that
--     dies without selling anything.
--
-- So a use is RESERVED when the vendor sends the priced quote, REDEEMED when
-- the client accepts it, and RELEASED when the quote is declined, withdrawn or
-- lapses. `discount_remaining_uses` counts reserved and redeemed; released
-- rows return to the pool. That is what makes the number on the card
-- ("3 left") a number the checkout will honour.
--
-- The row is kept on release rather than deleted, because "this client tried
-- and did not proceed" is the most useful thing a vendor's campaign report can
-- tell them, and a deleted row tells them nothing.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'discount_redemption_status') then
    create type public.discount_redemption_status as enum ('reserved', 'redeemed', 'released');
  end if;
end$$;

alter table public.discount_redemptions
  add column if not exists status public.discount_redemption_status not null default 'redeemed',

  -- Denormalised from the quotation so a vendor's campaign report is one scan
  -- of this table rather than a join through quotations to packages. Written
  -- once at reserve time and never updated: it records what the offer was
  -- spent on, which does not change when the package is later edited.
  add column if not exists vendor_id   uuid references public.vendors(id) on delete set null,
  add column if not exists template_id uuid references public.quote_templates(id) on delete set null,
  add column if not exists tier_id     uuid references public.quote_template_tiers(id) on delete set null,

  add column if not exists reserved_at timestamptz not null default now(),
  add column if not exists redeemed_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists release_reason text;

comment on column public.discount_redemptions.status is
  'reserved = the vendor sent a quote priced with this offer; redeemed = the client accepted it; '
  'released = it fell through and the use returned to the pool.';

-- One live claim per quotation. A vendor re-pricing and re-sending the same
-- quote must move the existing row, not stack a second reservation onto the
-- same campaign — which is how one quote could eat a whole cap.
--
-- `unique (discount_id, booking_id)` from 0008 is left in place: it is a
-- different statement (one claim per booking) and null booking_ids do not
-- collide under it.
create unique index if not exists ux_redemption_live_per_quotation
  on public.discount_redemptions(quotation_id)
  where quotation_id is not null and status in ('reserved', 'redeemed');

create index if not exists ix_redemptions_client
  on public.discount_redemptions(redeemed_by, discount_id) where status <> 'released';
create index if not exists ix_redemptions_vendor
  on public.discount_redemptions(vendor_id, created_at desc);

-- ---------------------------------------------------------------------
-- `used_count` BECOMES A CACHE
--
-- The column has been zero on every row since 0008 because nothing ever wrote
-- it. It stays, because the vendor portal's metrics read it and a campaign
-- list that calls `discount_remaining_uses` once per row is a query per card.
-- What changes is that it is now maintained by the ledger rather than by
-- whoever remembers to increment it — which is the only arrangement under
-- which the cache and the cap cannot disagree.
-- ---------------------------------------------------------------------
create or replace function public.tg_discount_recount()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[] := array_remove(array[
    case when tg_op <> 'INSERT' then old.discount_id end,
    case when tg_op <> 'DELETE' then new.discount_id end], null);
  v_id  uuid;
begin
  foreach v_id in array v_ids loop
    update public.discounts d
       set used_count = (
             select count(*) from public.discount_redemptions r
              where r.discount_id = d.id and r.status in ('reserved', 'redeemed'))
     where d.id = v_id;
  end loop;
  return null;
end;$$;

drop trigger if exists trg_discount_recount on public.discount_redemptions;
create trigger trg_discount_recount
  after insert or update or delete on public.discount_redemptions
  for each row execute function public.tg_discount_recount();

-- Bring the cache in line with the ledger it now mirrors. A no-op today —
-- there are no redemption rows — and the correct thing to run anyway, so this
-- file leaves the two consistent rather than merely arranging that they will
-- be from the next write onward.
update public.discounts d
   set used_count = (select count(*) from public.discount_redemptions r
                      where r.discount_id = d.id and r.status in ('reserved', 'redeemed'))
 where d.used_count is distinct from (
   select count(*) from public.discount_redemptions r
    where r.discount_id = d.id and r.status in ('reserved', 'redeemed'));

-- ---------------------------------------------------------------------
-- WHAT A QUOTATION REMEMBERS ABOUT THE OFFER IT WAS PRICED WITH
--
-- `discount_rate` / `discount_total` already exist and mean the TIER's own
-- discount — the rate a vendor set on the package, which is baked into the
-- price on the card. An offer is a second, separate reduction applied after
-- it, and folding the two into one column would make a quote unable to say
-- what the client actually saved by using their code.
--
-- `offer_discount_id` is set at request time (the client names the offer) and
-- confirmed at send time (the server re-validates and prices it). Keeping the
-- client's choice on the row is what lets the vendor's builder open with the
-- offer already applied rather than the vendor having to be told about it in
-- the message thread.
-- ---------------------------------------------------------------------
alter table public.quotations
  add column if not exists offer_discount_id    uuid references public.discounts(id) on delete set null,
  add column if not exists offer_discount_total numeric(14,2) not null default 0,
  add column if not exists offer_discount_code  text;

comment on column public.quotations.offer_discount_total is
  'What the promotion/discount took off, on top of the package tier''s own discount_rate. '
  'discount_total is the tier''s reduction; the two are separate so a client can see both.';

create index if not exists ix_quotations_offer on public.quotations(offer_discount_id)
  where offer_discount_id is not null;
