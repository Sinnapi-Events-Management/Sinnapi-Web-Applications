-- =====================================================================
-- Sinnapi — 0823b Quote packages: templates that carry a price
--
-- WHAT WAS BROKEN
-- `quote_templates` shipped in 0006 with `name`, `currency`, `notes` and
-- `is_active`, and a sibling `quote_template_items` table holding
-- description/quantity/unit_price/sort_order. Three years of surface area were
-- built on top of neither:
--
--   * Nothing has ever inserted a `quote_template_items` row. The vendor
--     portal's template form writes `name` and `notes` and stops, so the
--     items table has been empty since it was created and the card that reads
--     `quote_template_items(id)` has always rendered "0 items".
--   * `quotations.template_id` is declared and has never been set by any code
--     path. A template could not be applied to a quote because a template had
--     nothing in it to apply.
--   * `qtpl_rw` is `is_vendor_owner` for all operations, so no client and no
--     admin has ever been able to read a template. There is no visibility
--     column to gate such a read on in the first place.
--
-- The net effect is that a vendor could name a thing, and that was all. Every
-- quotation on the platform has been typed from a blank row.
--
-- WHAT THIS CHANGES IT INTO
-- A template becomes a PACKAGE: a named, publishable offer that a vendor can
-- show to the market and apply to a quote in one action.
--
-- Vendors sell in tiers — Silver / Gold / Platinum, or Half-day / Full-day —
-- and the same handful of extras attaches to any of them. So the shape is
-- three levels, not two:
--
--   quote_templates          the package        "Wedding Photography"
--     └─ quote_template_tiers   the tiers       Silver | Gold | Platinum
--          └─ quote_template_items  the lines   priced, per tier
--     └─ quote_template_items (tier_id null)    shared optional add-ons
--
-- A line with `tier_id` set belongs to that tier. A line with `tier_id` null
-- is an add-on offered alongside every tier, which is why the check constraint
-- below insists such a line is optional: a mandatory line that belongs to no
-- tier has no price it could ever be part of.
--
-- WHY ITEMS KEEP `template_id` AS WELL AS `tier_id`
-- It is redundant for tier lines and load-bearing for add-ons, and keeping one
-- column shape for both means the add-ons and the tier lines are one table,
-- one policy, and one delete cascade rather than two of each.
--
-- PRICE DISCLOSURE
-- Published packages are itemised in public — every line, quantity and unit
-- price. That is a deliberate product call, not an oversight, and it is why
-- the read policies below do not attempt to redact: there is nothing on these
-- rows a published package is meant to withhold.
--
-- WHERE THE MONEY IS COMPUTED
-- Twice, on purpose, and the two must agree:
--   * `packagePricing.ts` in @sinnapi/ui computes what a reader is *shown* —
--     on the vendor's editor, the client's package card and the public site.
--   * `send_quotation` below computes what a client is *charged*. That number
--     lands on `quotations` and flows into escrow, so it is computed here,
--     from the items as sent, and never taken from the browser.
-- The formula is stated once in the comment above `send_quotation` and both
-- implementations follow it.
--
-- ADMIN REACH
-- Admins read every package, published or not, and can force one private with
-- a reason on the record. They cannot edit one: a package is a vendor's offer,
-- and the console's job here is to take a bad one off the market, not to
-- rewrite what a vendor is selling.
-- =====================================================================

-- ---------------------------------------------------------------------
-- VISIBILITY
--
-- An enum rather than a boolean because "who can see this" has already grown
-- a third answer once on this platform (`vendors.visibility`), and matching
-- that column's vocabulary means the two read the same way in a policy.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'package_visibility') then
    create type public.package_visibility as enum ('private', 'public');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- QUOTE_TEMPLATES → the package header
-- ---------------------------------------------------------------------
alter table public.quote_templates
  -- What it is, for a reader who is not the vendor.
  add column if not exists summary            text,
  add column if not exists cover_image_url    text,
  add column if not exists vendor_service_id  uuid references public.vendor_services(id) on delete set null,
  add column if not exists category_id        uuid references public.service_categories(id),

  -- Scope, stated positively and negatively. Both are arrays rather than prose
  -- so the public card can render them as two lists a client can scan, and so
  -- "what is NOT included" is as prominent as what is — the single largest
  -- source of dispute on a delivered event.
  add column if not exists inclusions         text[] not null default '{}',
  add column if not exists exclusions         text[] not null default '{}',

  -- How far ahead the vendor needs to be booked for this package.
  add column if not exists lead_time_days     integer,

  -- Tax. `tax_inclusive` decides whether `tax_rate` is added to the line
  -- prices or already sitting inside them: a VAT-registered vendor quoting
  -- business clients usually wants exclusive, a vendor quoting consumers
  -- usually wants the number on the card to be the number paid.
  add column if not exists tax_rate           numeric(5,2) not null default 0,
  add column if not exists tax_inclusive      boolean      not null default false,

  -- Defaults the builder pre-fills, so terms stop being retyped per quote.
  add column if not exists valid_days         integer,
  add column if not exists advance_rate       numeric(5,2),
  add column if not exists advance_release_days_before integer,
  add column if not exists advance_terms_note text,

  add column if not exists visibility         public.package_visibility not null default 'private',
  add column if not exists published_at       timestamptz,
  add column if not exists sort_order         integer not null default 0,

  -- Admin moderation. `admin_unpublished_at` is what the read policies test,
  -- and it is separate from `visibility` so that a vendor flipping their own
  -- toggle back on cannot undo a moderator's decision.
  add column if not exists admin_unpublished_at     timestamptz,
  add column if not exists admin_unpublished_by     uuid references public.profiles(id),
  add column if not exists admin_unpublished_reason text;

alter table public.quote_templates
  drop constraint if exists ck_quote_templates_tax_rate;
alter table public.quote_templates
  add constraint ck_quote_templates_tax_rate check (tax_rate >= 0 and tax_rate <= 100);

alter table public.quote_templates
  drop constraint if exists ck_quote_templates_lead_time;
alter table public.quote_templates
  add constraint ck_quote_templates_lead_time check (lead_time_days is null or lead_time_days >= 0);

alter table public.quote_templates
  drop constraint if exists ck_quote_templates_valid_days;
alter table public.quote_templates
  add constraint ck_quote_templates_valid_days
  check (valid_days is null or (valid_days >= 1 and valid_days <= 365));

-- The public listing predicate, in the order the planner should test it.
create index if not exists ix_quote_templates_public
  on public.quote_templates(vendor_id, sort_order)
  where visibility = 'public'::public.package_visibility
    and is_active and deleted_at is null and admin_unpublished_at is null;

create index if not exists ix_quote_templates_service  on public.quote_templates(vendor_service_id);
create index if not exists ix_quote_templates_category on public.quote_templates(category_id);

-- ---------------------------------------------------------------------
-- QUOTE_TEMPLATE_TIERS → the tiers inside a package
-- ---------------------------------------------------------------------
create table if not exists public.quote_template_tiers (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.quote_templates(id) on delete cascade,
  name           text not null,
  description    text,
  -- The tier the vendor wants read first. Enforced to at most one per package
  -- by the unique index below — "recommended" means nothing if everything is.
  is_recommended boolean not null default false,
  -- A tier-level discount rather than a package-level one: a vendor discounts
  -- the tier they are trying to move, not their whole catalogue.
  discount_rate  numeric(5,2) not null default 0 check (discount_rate >= 0 and discount_rate <= 100),
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ix_qtt_template on public.quote_template_tiers(template_id, sort_order);

create unique index if not exists ux_qtt_one_recommended
  on public.quote_template_tiers(template_id) where is_recommended;

-- ---------------------------------------------------------------------
-- QUOTE_TEMPLATE_ITEMS → the priced lines
-- ---------------------------------------------------------------------
alter table public.quote_template_items
  add column if not exists tier_id     uuid references public.quote_template_tiers(id) on delete cascade,
  -- An add-on: quoted alongside the tier, not inside its total. The vendor
  -- ticks the ones a given client is getting when they build the quote; the
  -- client receives one settled figure, not a configurator.
  add column if not exists is_optional boolean not null default false,
  -- "per hour", "per guest", "per day" — the unit the quantity counts, which
  -- is the difference between a plausible line and an ambiguous one.
  add column if not exists unit_label  text,
  add column if not exists notes       text;

create index if not exists ix_qti_tier on public.quote_template_items(tier_id, sort_order);

-- ---------------------------------------------------------------------
-- BACKFILL
--
-- Every existing template is a package with one unnamed tier. There are no
-- item rows to move (nothing ever wrote one), but the tier is created anyway
-- so that every package in the table has the same shape and the editor never
-- has to special-case a package with no tiers.
-- ---------------------------------------------------------------------
insert into public.quote_template_tiers (template_id, name, sort_order, is_recommended)
select t.id, 'Standard', 0, true
  from public.quote_templates t
 where not exists (select 1 from public.quote_template_tiers x where x.template_id = t.id);

update public.quote_template_items i
   set tier_id = (select x.id from public.quote_template_tiers x
                   where x.template_id = i.template_id
                   order by x.sort_order limit 1)
 where i.tier_id is null and not i.is_optional;

-- Now that no legacy row can violate it: a line that belongs to no tier is an
-- add-on offered across the package, and only an add-on.
alter table public.quote_template_items
  drop constraint if exists ck_qti_tier_or_optional;
alter table public.quote_template_items
  add constraint ck_qti_tier_or_optional check (tier_id is not null or is_optional);

-- ---------------------------------------------------------------------
-- QUOTATIONS → what the quote was built from, and how it was priced
--
-- The rate columns are stored beside the totals they produced rather than
-- re-read from the template, because a template is edited and a sent quote is
-- a record of an offer. A vendor who raises their VAT rate next month must not
-- change the arithmetic on a quote a client accepted last week.
-- ---------------------------------------------------------------------
alter table public.quotations
  add column if not exists template_tier_id uuid references public.quote_template_tiers(id) on delete set null,
  add column if not exists discount_rate    numeric(5,2),
  add column if not exists tax_rate         numeric(5,2),
  add column if not exists tax_inclusive    boolean not null default false;

create index if not exists ix_quotations_template on public.quotations(template_id);

-- ---------------------------------------------------------------------
-- TRIGGERS
-- The generic wiring in 0010 ran by introspection at seed time, so a table
-- created afterwards gets its triggers explicitly or silently goes without.
-- ---------------------------------------------------------------------
drop trigger if exists trg_updated_at on public.quote_template_tiers;
create trigger trg_updated_at before update on public.quote_template_tiers
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- READ PREDICATE
--
-- One function, four callers: the policy on each of the three package tables
-- and the RPCs. Written once so "published" cannot come to mean two different
-- things depending on which table you arrived through.
--
-- `vendor_is_public` is part of it deliberately — a suspended vendor's
-- packages leave the market with the vendor, without anyone having to
-- remember to unpublish them one by one.
-- ---------------------------------------------------------------------
create or replace function public.quote_package_is_public(p_template_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.quote_templates t
     where t.id = p_template_id
       and t.visibility = 'public'
       and t.is_active
       and t.deleted_at is null
       and t.admin_unpublished_at is null
       and public.vendor_is_public(t.vendor_id)
  );
$$;

-- Who in the console may look at packages that are not published.
create or replace function public.can_review_vendors()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission('vendor.review') or public.has_permission('vendor.manage');
$$;

-- ---------------------------------------------------------------------
-- RLS
--
-- Writes stay exactly where they were — the owning vendor, and nobody else.
-- What is new is a read: `anon` and every signed-in user may select a
-- published package, its tiers and its lines, which is what puts packages on
-- the marketing site and in the client portal without a bespoke RPC for each.
--
-- The write policies are split out of the old `for all` so that the read arm
-- can be widened without widening the write arm with it.
-- ---------------------------------------------------------------------
alter table public.quote_template_tiers enable row level security;
alter table public.quote_template_tiers force  row level security;

drop policy if exists qtpl_rw          on public.quote_templates;
drop policy if exists qtpl_items_rw    on public.quote_template_items;

-- Packages
-- The published predicate is spelled out here rather than routed through
-- `quote_package_is_public`, which reads this same table: under
-- `force row level security` a definer function called from a table's own
-- policy re-enters that policy. Every other policy on the platform observes
-- the same rule — `vendor_is_public` appears on vendors' CHILD tables and
-- never on `vendors` itself, which inlines `status`/`visibility` instead.
drop policy if exists qtpl_read  on public.quote_templates;
create policy qtpl_read on public.quote_templates for select to anon, authenticated
  using ((visibility = 'public'::public.package_visibility
          and is_active
          and deleted_at is null
          and admin_unpublished_at is null
          and public.vendor_is_public(vendor_id))
         or public.is_vendor_owner(vendor_id)
         or public.can_review_vendors());

drop policy if exists qtpl_write on public.quote_templates;
create policy qtpl_write on public.quote_templates for all to authenticated
  using (public.is_vendor_owner(vendor_id))
  with check (public.is_vendor_owner(vendor_id));

-- Tiers
drop policy if exists qtt_read on public.quote_template_tiers;
create policy qtt_read on public.quote_template_tiers for select to anon, authenticated
  using (public.quote_package_is_public(template_id)
         or exists (select 1 from public.quote_templates t
                     where t.id = template_id and public.is_vendor_owner(t.vendor_id))
         or public.can_review_vendors());

drop policy if exists qtt_write on public.quote_template_tiers;
create policy qtt_write on public.quote_template_tiers for all to authenticated
  using (exists (select 1 from public.quote_templates t
                  where t.id = template_id and public.is_vendor_owner(t.vendor_id)))
  with check (exists (select 1 from public.quote_templates t
                  where t.id = template_id and public.is_vendor_owner(t.vendor_id)));

-- Lines
drop policy if exists qti_read on public.quote_template_items;
create policy qti_read on public.quote_template_items for select to anon, authenticated
  using (public.quote_package_is_public(template_id)
         or exists (select 1 from public.quote_templates t
                     where t.id = template_id and public.is_vendor_owner(t.vendor_id))
         or public.can_review_vendors());

drop policy if exists qti_write on public.quote_template_items;
create policy qti_write on public.quote_template_items for all to authenticated
  using (exists (select 1 from public.quote_templates t
                  where t.id = template_id and public.is_vendor_owner(t.vendor_id)))
  with check (exists (select 1 from public.quote_templates t
                  where t.id = template_id and public.is_vendor_owner(t.vendor_id)));

-- =====================================================================
-- WRITES
--
-- A package is a tree — header, tiers, lines — and the editor saves the whole
-- tree at once. Doing that through PostgREST would be three round trips with
-- no transaction around them, and a failure on the third leaves a vendor with
-- a package whose tiers do not match its lines. So the editor calls one
-- function and either the whole tree lands or none of it does.
-- =====================================================================

-- ---------------------------------------------------------------------
-- save_quote_package — insert or update a whole package in one call.
--
-- Tiers are reconciled by id rather than deleted and recreated, because
-- `quotations.template_tier_id` points at them: a vendor fixing a typo in a
-- tier name must not sever every quote ever sent from that tier. Lines carry
-- no such references and are cheaper to replace wholesale, so they are.
-- ---------------------------------------------------------------------
create or replace function public.save_quote_package(
  p_vendor_id uuid,
  p_package   jsonb,
  p_tiers     jsonb,
  p_add_ons   jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id          uuid := nullif(p_package->>'id', '')::uuid;
  v_tier        jsonb;
  v_item        jsonb;
  v_tier_id     uuid;
  v_keep        uuid[] := '{}';
  v_recommended uuid;
  v_max_rate    numeric;
  v_max_days    int;
  v_tax_rate    numeric := coalesce((p_package->>'tax_rate')::numeric, 0);
  v_adv_rate    numeric := nullif(p_package->>'advance_rate', '')::numeric;
  v_adv_days    int     := nullif(p_package->>'advance_release_days_before', '')::int;
  v_idx         int := 0;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.is_vendor_owner(p_vendor_id) then perform public._forbidden(); end if;

  if nullif(btrim(coalesce(p_package->>'name', '')), '') is null then
    raise exception 'package_name_required';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array' or jsonb_array_length(p_tiers) = 0 then
    raise exception 'package_needs_a_tier';
  end if;
  if v_tax_rate < 0 or v_tax_rate > 100 then
    raise exception 'tax_rate_out_of_range: must be between 0 and 100';
  end if;

  -- The advance ceilings are the platform's, checked here for the same reason
  -- `send_quotation` checks them: a package pre-fills the builder, and a
  -- package holding an illegal rate would put one in front of the vendor.
  v_max_rate := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::int, 30);
  if v_adv_rate is not null and (v_adv_rate < 0 or v_adv_rate > v_max_rate) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_max_rate;
  end if;
  if v_adv_days is not null and (v_adv_days < 0 or v_adv_days > v_max_days) then
    raise exception 'advance_release_days_out_of_range: must be between 0 and %', v_max_days;
  end if;

  -- ---- header ----
  if v_id is null then
    insert into public.quote_templates(
      vendor_id, name, summary, notes, currency, cover_image_url, vendor_service_id, category_id,
      inclusions, exclusions, lead_time_days, tax_rate, tax_inclusive, valid_days,
      advance_rate, advance_release_days_before, advance_terms_note, is_active, sort_order)
    values (
      p_vendor_id,
      btrim(p_package->>'name'),
      nullif(btrim(coalesce(p_package->>'summary', '')), ''),
      nullif(btrim(coalesce(p_package->>'notes', '')), ''),
      coalesce(nullif(p_package->>'currency', ''), 'UGX'),
      nullif(btrim(coalesce(p_package->>'cover_image_url', '')), ''),
      nullif(p_package->>'vendor_service_id', '')::uuid,
      nullif(p_package->>'category_id', '')::uuid,
      coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'inclusions', '[]'::jsonb))), '{}'::text[]),
      coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'exclusions', '[]'::jsonb))), '{}'::text[]),
      nullif(p_package->>'lead_time_days', '')::int,
      v_tax_rate,
      coalesce((p_package->>'tax_inclusive')::boolean, false),
      nullif(p_package->>'valid_days', '')::int,
      v_adv_rate, v_adv_days,
      nullif(btrim(coalesce(p_package->>'advance_terms_note', '')), ''),
      coalesce((p_package->>'is_active')::boolean, true),
      coalesce((p_package->>'sort_order')::int, 0))
    returning id into v_id;
  else
    update public.quote_templates set
      name              = btrim(p_package->>'name'),
      summary           = nullif(btrim(coalesce(p_package->>'summary', '')), ''),
      notes             = nullif(btrim(coalesce(p_package->>'notes', '')), ''),
      currency          = coalesce(nullif(p_package->>'currency', ''), currency),
      cover_image_url   = nullif(btrim(coalesce(p_package->>'cover_image_url', '')), ''),
      vendor_service_id = nullif(p_package->>'vendor_service_id', '')::uuid,
      category_id       = nullif(p_package->>'category_id', '')::uuid,
      inclusions        = coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'inclusions', '[]'::jsonb))), '{}'::text[]),
      exclusions        = coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'exclusions', '[]'::jsonb))), '{}'::text[]),
      lead_time_days    = nullif(p_package->>'lead_time_days', '')::int,
      tax_rate          = v_tax_rate,
      tax_inclusive     = coalesce((p_package->>'tax_inclusive')::boolean, false),
      valid_days        = nullif(p_package->>'valid_days', '')::int,
      advance_rate      = v_adv_rate,
      advance_release_days_before = v_adv_days,
      advance_terms_note = nullif(btrim(coalesce(p_package->>'advance_terms_note', '')), ''),
      is_active         = coalesce((p_package->>'is_active')::boolean, is_active),
      sort_order        = coalesce((p_package->>'sort_order')::int, sort_order)
    where id = v_id and vendor_id = p_vendor_id and deleted_at is null;
    if not found then raise exception 'not_found'; end if;
  end if;

  -- Cleared up front so the partial unique index cannot trip while the tiers
  -- are half-written; the winner is set once at the end.
  update public.quote_template_tiers set is_recommended = false where template_id = v_id;

  -- ---- tiers ----
  for v_tier in select * from jsonb_array_elements(p_tiers) loop
    if nullif(btrim(coalesce(v_tier->>'name', '')), '') is null then
      raise exception 'tier_name_required';
    end if;

    v_tier_id := nullif(v_tier->>'id', '')::uuid;

    if v_tier_id is null then
      insert into public.quote_template_tiers(template_id, name, description, discount_rate, sort_order)
      values (v_id, btrim(v_tier->>'name'),
              nullif(btrim(coalesce(v_tier->>'description', '')), ''),
              coalesce((v_tier->>'discount_rate')::numeric, 0),
              v_idx)
      returning id into v_tier_id;
    else
      update public.quote_template_tiers set
        name          = btrim(v_tier->>'name'),
        description   = nullif(btrim(coalesce(v_tier->>'description', '')), ''),
        discount_rate = coalesce((v_tier->>'discount_rate')::numeric, 0),
        sort_order    = v_idx
      where id = v_tier_id and template_id = v_id;
      if not found then raise exception 'tier_not_found'; end if;
    end if;

    v_keep := v_keep || v_tier_id;
    if coalesce((v_tier->>'is_recommended')::boolean, false) then v_recommended := v_tier_id; end if;

    delete from public.quote_template_items where tier_id = v_tier_id;

    insert into public.quote_template_items(
      template_id, tier_id, description, quantity, unit_price, unit_label, notes, is_optional, sort_order)
    select v_id, v_tier_id,
           btrim(item->>'description'),
           coalesce((item->>'quantity')::numeric, 1),
           coalesce((item->>'unit_price')::numeric, 0),
           nullif(btrim(coalesce(item->>'unit_label', '')), ''),
           nullif(btrim(coalesce(item->>'notes', '')), ''),
           coalesce((item->>'is_optional')::boolean, false),
           (ord - 1)::int
      from jsonb_array_elements(coalesce(v_tier->'items', '[]'::jsonb)) with ordinality as t(item, ord)
     where nullif(btrim(coalesce(item->>'description', '')), '') is not null;

    if not exists (select 1 from public.quote_template_items
                    where tier_id = v_tier_id and not is_optional) then
      raise exception 'tier_needs_a_line: %', v_tier->>'name';
    end if;

    v_idx := v_idx + 1;
  end loop;

  -- Tiers the vendor removed in this edit. Their lines go with them by
  -- cascade; quotes that were built from them keep their own copied items and
  -- lose only the back-reference, which is what `on delete set null` is for.
  delete from public.quote_template_tiers
   where template_id = v_id and not (id = any(v_keep));

  if v_recommended is not null then
    update public.quote_template_tiers set is_recommended = true where id = v_recommended;
  end if;

  -- ---- shared add-ons (tier_id null) ----
  delete from public.quote_template_items where template_id = v_id and tier_id is null;

  insert into public.quote_template_items(
    template_id, tier_id, description, quantity, unit_price, unit_label, notes, is_optional, sort_order)
  select v_id, null::uuid,
         btrim(item->>'description'),
         coalesce((item->>'quantity')::numeric, 1),
         coalesce((item->>'unit_price')::numeric, 0),
         nullif(btrim(coalesce(item->>'unit_label', '')), ''),
         nullif(btrim(coalesce(item->>'notes', '')), ''),
         true,
         (ord - 1)::int
    from jsonb_array_elements(coalesce(p_add_ons, '[]'::jsonb)) with ordinality as t(item, ord)
   where nullif(btrim(coalesce(item->>'description', '')), '') is not null;

  return v_id;
end;$$;

-- ---------------------------------------------------------------------
-- set_quote_package_visibility — the vendor's own publish toggle.
--
-- Publishing is gated on the package being worth reading. An empty package on
-- a public profile costs the vendor more than no package at all, so the check
-- is here rather than left to the form: PostgREST is not the only door.
--
-- A package a moderator has taken down cannot be republished from here. The
-- vendor is told so explicitly rather than being allowed to flip a switch that
-- silently does nothing.
-- ---------------------------------------------------------------------
create or replace function public.set_quote_package_visibility(
  p_template_id uuid,
  p_public      boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t public.quote_templates;
begin
  select * into t from public.quote_templates where id = p_template_id and deleted_at is null;
  if t.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(t.vendor_id) then perform public._forbidden(); end if;

  if p_public then
    if t.admin_unpublished_at is not null then
      raise exception 'package_withheld_by_admin';
    end if;
    if not exists (
      select 1 from public.quote_template_tiers ti
       where ti.template_id = t.id
         and exists (select 1 from public.quote_template_items i
                      where i.tier_id = ti.id and not i.is_optional and i.unit_price > 0)) then
      raise exception 'package_not_ready: add at least one priced line before publishing';
    end if;
  end if;

  update public.quote_templates
     set visibility   = case when p_public then 'public' else 'private' end::public.package_visibility,
         published_at = case when p_public then coalesce(published_at, now()) else published_at end,
         is_active    = case when p_public then true else is_active end
   where id = p_template_id;
end;$$;

-- ---------------------------------------------------------------------
-- admin_unpublish_quote_package — the console takes a package off the market.
--
-- A reason is mandatory. The vendor is going to ask why their package
-- disappeared, and an audit row that says only "an admin did this" does not
-- answer them.
-- ---------------------------------------------------------------------
create or replace function public.admin_unpublish_quote_package(
  p_template_id uuid,
  p_reason      text)
returns void language plpgsql security definer set search_path = public as $$
declare
  t        public.quote_templates;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.has_permission('vendor.manage') then perform public._forbidden(); end if;
  if v_reason is null then raise exception 'reason_required'; end if;

  select * into t from public.quote_templates where id = p_template_id and deleted_at is null;
  if t.id is null then raise exception 'not_found'; end if;

  update public.quote_templates
     set visibility               = 'private',
         admin_unpublished_at     = now(),
         admin_unpublished_by     = auth.uid(),
         admin_unpublished_reason = v_reason
   where id = p_template_id;

  -- Through `notify_party` rather than a raw insert, so this lands with the
  -- same copy resolution, locale and email fan-out as every other lifecycle
  -- notification on the platform. The template is seeded at the foot of this
  -- migration; `notify_party` degrades to a derived title if it is ever absent.
  perform public.notify_party(
    'quote_package.unpublished',
    (select v.owner_id from public.vendors v where v.id = t.vendor_id),
    'vendor', 'quote_template', t.id,
    jsonb_build_object('vendor_id', t.vendor_id, 'package_name', t.name, 'reason', v_reason));
end;$$;

-- Restoring one is a separate function so the two show up separately in an
-- audit trail, and so `vendor.manage` cannot restore by passing a flag.
create or replace function public.admin_restore_quote_package(p_template_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('vendor.manage') then perform public._forbidden(); end if;
  update public.quote_templates
     set admin_unpublished_at = null, admin_unpublished_by = null, admin_unpublished_reason = null
   where id = p_template_id and deleted_at is null;
  if not found then raise exception 'not_found'; end if;
end;$$;

-- ---------------------------------------------------------------------
-- duplicate_quote_package — the way a vendor makes their second package.
-- Copies land private: a duplicate is a draft of something else, and shipping
-- two identical packages to a public profile is nobody's intent.
-- ---------------------------------------------------------------------
create or replace function public.duplicate_quote_package(p_template_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t      public.quote_templates;
  v_new  uuid;
  v_tier record;
  v_copy uuid;
begin
  select * into t from public.quote_templates where id = p_template_id and deleted_at is null;
  if t.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(t.vendor_id) then perform public._forbidden(); end if;

  insert into public.quote_templates(
    vendor_id, name, summary, notes, currency, cover_image_url, vendor_service_id, category_id,
    inclusions, exclusions, lead_time_days, tax_rate, tax_inclusive, valid_days,
    advance_rate, advance_release_days_before, advance_terms_note, is_active, sort_order, visibility)
  values (
    t.vendor_id, left(t.name || ' (copy)', 120), t.summary, t.notes, t.currency, t.cover_image_url,
    t.vendor_service_id, t.category_id, t.inclusions, t.exclusions, t.lead_time_days,
    t.tax_rate, t.tax_inclusive, t.valid_days, t.advance_rate, t.advance_release_days_before,
    t.advance_terms_note, t.is_active, t.sort_order + 1, 'private')
  returning id into v_new;

  for v_tier in select * from public.quote_template_tiers where template_id = t.id order by sort_order loop
    insert into public.quote_template_tiers(template_id, name, description, is_recommended, discount_rate, sort_order)
    values (v_new, v_tier.name, v_tier.description, v_tier.is_recommended, v_tier.discount_rate, v_tier.sort_order)
    returning id into v_copy;

    insert into public.quote_template_items(
      template_id, tier_id, description, quantity, unit_price, unit_label, notes, is_optional, sort_order)
    select v_new, v_copy, i.description, i.quantity, i.unit_price, i.unit_label, i.notes, i.is_optional, i.sort_order
      from public.quote_template_items i where i.tier_id = v_tier.id;
  end loop;

  insert into public.quote_template_items(
    template_id, tier_id, description, quantity, unit_price, unit_label, notes, is_optional, sort_order)
  select v_new, null, i.description, i.quantity, i.unit_price, i.unit_label, i.notes, true, i.sort_order
    from public.quote_template_items i where i.template_id = t.id and i.tier_id is null;

  return v_new;
end;$$;

-- ---------------------------------------------------------------------
-- delete_quote_package — soft, and private on the way out.
-- Dropping visibility as well as setting `deleted_at` means a restore is a
-- deliberate republish rather than something that quietly reappears on a
-- public profile.
-- ---------------------------------------------------------------------
create or replace function public.delete_quote_package(p_template_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.quote_templates;
begin
  select * into t from public.quote_templates where id = p_template_id and deleted_at is null;
  if t.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(t.vendor_id) then perform public._forbidden(); end if;

  update public.quote_templates
     set deleted_at = now(), deleted_by = auth.uid(), visibility = 'private', is_active = false
   where id = p_template_id;
end;$$;

-- =====================================================================
-- APPLYING A PACKAGE TO A QUOTE
-- =====================================================================

-- ---------------------------------------------------------------------
-- send_quotation — now aware of where the lines came from, and of tax.
--
-- Body as 0809c, plus three things:
--
--   1. `template_id` / `template_tier_id` are recorded. They have never been
--      set before; `template_id` has been a declared-and-unwritten column
--      since 0006.
--   2. Discount and tax are computed and stored. `discount_total` and
--      `tax_total` have been on `quotations` since 0006 and have been the
--      constant 0 in every row ever written, because the only writer set
--      `total = subtotal - discount_total + tax_total` against two zeros.
--   3. The rates are stored alongside the totals, so the breakdown a client
--      reads next year is reconstructable from the quote rather than from a
--      template the vendor has since edited.
--
-- THE FORMULA — the one @sinnapi/ui `packagePricing.ts` mirrors for display:
--
--     base     = Σ (quantity × unit_price)          over the sent lines
--     discount = round(base × discount_rate/100, 2)
--     net      = base − discount
--     exclusive:  tax   = round(net × rate/100, 2)     total = net + tax
--     inclusive:  tax   = round(net − net/(1+rate/100), 2)
--                                                      total = net
--
-- Inclusive pricing does not change what the client pays — that is the point
-- of it. It changes what the receipt says the tax component was, and a
-- VAT-registered vendor needs that number to be right on the record even
-- though it was never added to the price.
--
-- `subtotal` stays the gross of the lines under both modes so that the
-- breakdown always reads subtotal − discount ± tax = total.
-- ---------------------------------------------------------------------
create or replace function public.send_quotation(
  p_quotation_id     uuid,
  p_items            jsonb,
  p_valid_days       int     default null,
  p_advance_rate     numeric default null,
  p_advance_release_days_before int default null,
  p_advance_terms_note text  default null,
  p_template_id      uuid    default null,
  p_template_tier_id uuid    default null,
  p_discount_rate    numeric default null,
  p_tax_rate         numeric default null,
  p_tax_inclusive    boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q          public.quotations;
  it         jsonb;
  v_base     numeric := 0;
  v_disc     numeric := 0;
  v_net      numeric := 0;
  v_tax      numeric := 0;
  v_total    numeric := 0;
  v_days     int;
  v_max_rate numeric;
  v_max_days int;
  v_dr       numeric := coalesce(p_discount_rate, 0);
  v_tr       numeric := coalesce(p_tax_rate, 0);
  v_ti       boolean := coalesce(p_tax_inclusive, false);
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(q.vendor_id) then perform public._forbidden(); end if;

  -- Bounds are the platform's, not the form's: a quotation row is reachable
  -- through PostgREST, so the ceiling has to hold here.
  v_max_rate := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::int, 30);

  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_max_rate) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_max_rate;
  end if;
  if p_advance_release_days_before is not null
     and (p_advance_release_days_before < 0 or p_advance_release_days_before > v_max_days) then
    raise exception 'advance_release_days_out_of_range: must be between 0 and %', v_max_days;
  end if;
  if v_dr < 0 or v_dr > 100 then raise exception 'discount_rate_out_of_range'; end if;
  if v_tr < 0 or v_tr > 100 then raise exception 'tax_rate_out_of_range'; end if;

  -- A vendor may only cite their own package. Without this a vendor could
  -- stamp a competitor's package id onto a quote and have it render as that
  -- competitor's offer on the client's page.
  if p_template_id is not null
     and not exists (select 1 from public.quote_templates t
                      where t.id = p_template_id and t.vendor_id = q.vendor_id and t.deleted_at is null) then
    raise exception 'package_not_found';
  end if;
  if p_template_tier_id is not null
     and not exists (select 1 from public.quote_template_tiers ti
                      where ti.id = p_template_tier_id and ti.template_id = p_template_id) then
    raise exception 'tier_not_in_package';
  end if;

  delete from public.quotation_items where quotation_id = p_quotation_id;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.quotation_items(quotation_id, description, quantity, unit_price, line_total)
    values (p_quotation_id, it->>'description',
            coalesce((it->>'quantity')::numeric,1), coalesce((it->>'unit_price')::numeric,0),
            coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0));
    v_base := v_base + coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0);
  end loop;

  v_disc := round(v_base * v_dr / 100, 2);
  v_net  := v_base - v_disc;
  if v_ti then
    v_tax   := round(v_net - (v_net / (1 + v_tr / 100)), 2);
    v_total := v_net;
  else
    v_tax   := round(v_net * v_tr / 100, 2);
    v_total := v_net + v_tax;
  end if;

  v_days := coalesce(p_valid_days, (public.get_setting('quote_expiry_days') #>> '{}')::int, 14);

  update public.quotations
     set status = 'sent',
         subtotal       = v_base,
         discount_total = v_disc,
         tax_total      = v_tax,
         total          = v_total,
         discount_rate  = v_dr,
         tax_rate       = v_tr,
         tax_inclusive  = v_ti,
         template_id      = coalesce(p_template_id, template_id),
         template_tier_id = coalesce(p_template_tier_id, template_tier_id),
         sent_at = now(),
         valid_until = now() + make_interval(days => v_days),
         advance_rate = coalesce(p_advance_rate,
                                 (public.get_setting('advance_rate_default') #>> '{}')::numeric),
         advance_release_days_before = coalesce(p_advance_release_days_before,
                                 (public.get_setting('advance_release_days_default') #>> '{}')::int),
         advance_terms_note = p_advance_terms_note
   where id = p_quotation_id;
end;$$;

-- The 6-argument overload from 0809c would still resolve for a 6-argument call
-- and would silently drop the pricing rates, leaving `total` computed from a
-- discount and tax of zero. Drop it so there is one entry point, exactly as
-- 0809c dropped the 3-argument one before it.
drop function if exists public.send_quotation(uuid, jsonb, int, numeric, int, text);

-- ---------------------------------------------------------------------
-- request_quotation — a client may now point at the package they want.
--
-- Body as 0807a (the reference-generation retry loop is unchanged), plus the
-- package the request is about. That is what turns "I'd like a price please"
-- into a request the vendor can answer in two clicks: the builder opens with
-- the tier already loaded because the client named it.
--
-- The package must be one the client could actually have seen. A request
-- citing a private package would show the vendor a client asking for something
-- that is not on offer, and would leak the existence of an unpublished draft.
-- ---------------------------------------------------------------------
create or replace function public.request_quotation(
  p_vendor_id        uuid,
  p_details          text,
  p_event_id         uuid default null,
  p_currency         text default 'UGX',
  p_template_id      uuid default null,
  p_template_tier_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  if p_template_id is not null then
    if not public.quote_package_is_public(p_template_id)
       or not exists (select 1 from public.quote_templates t
                       where t.id = p_template_id and t.vendor_id = p_vendor_id) then
      raise exception 'package_unavailable';
    end if;
    if p_template_tier_id is not null
       and not exists (select 1 from public.quote_template_tiers ti
                        where ti.id = p_template_tier_id and ti.template_id = p_template_id) then
      raise exception 'tier_not_in_package';
    end if;
  end if;

  for i in 1 .. 8 loop
    begin
      insert into public.quotations(
        vendor_id, client_id, event_id, status, currency, request_details,
        template_id, template_tier_id)
      values (p_vendor_id, auth.uid(), p_event_id, 'requested', p_currency, p_details,
              p_template_id, p_template_tier_id)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: quotations' using errcode = '23505';
end;$$;

drop function if exists public.request_quotation(uuid, text, uuid, text);

-- ---------------------------------------------------------------------
-- COPY for the one notification this migration introduces.
-- In-app only: a moderator taking a package down is not a deadline, and the
-- vendor sees it the next time they open the portal, which is where they would
-- have to go to fix it anyway.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
('quote_package.unpublished.vendor', 'in_app', '“{{package_name}}” was taken off your profile',
 'A moderator has made this package private, so clients can no longer see it. Reason: {{reason}}. Edit the package and publish it again once the issue is resolved, or contact support if you think this was a mistake.', 'en')
on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;

-- ---------------------------------------------------------------------
-- EXECUTE grants. 0014's blanket `grant execute on all functions` ran before
-- these existed, so they get theirs here. The two predicates are granted to
-- `anon` as well because the read policies above call them, and a published
-- package is meant to be readable by a visitor who has not signed in.
-- ---------------------------------------------------------------------
grant execute on function
  public.quote_package_is_public(uuid),
  public.can_review_vendors()
to anon, authenticated;

grant execute on function
  public.save_quote_package(uuid, jsonb, jsonb, jsonb),
  public.set_quote_package_visibility(uuid, boolean),
  public.admin_unpublish_quote_package(uuid, text),
  public.admin_restore_quote_package(uuid),
  public.duplicate_quote_package(uuid),
  public.delete_quote_package(uuid),
  public.send_quotation(uuid, jsonb, int, numeric, int, text, uuid, uuid, numeric, numeric, boolean),
  public.request_quotation(uuid, text, uuid, text, uuid, uuid)
to authenticated;
