-- =====================================================================
-- Sinnapi — 0823c Services as taxonomy, pricing models as a first-class term
--
-- WHAT WAS BROKEN
--
-- 1. A vendor could not create a service at all.
--    `vendor_services.category_id` has been `not null` since 0004, and the
--    vendor portal's create form has never sent one. Every attempt failed with
--    `null value in column "category_id" ... violates not-null constraint`,
--    which is a message about a column the vendor has never been shown.
--
-- 2. Two places claimed to hold the price of the same thing.
--    `vendor_services.base_price` was written by the services form and read by
--    exactly two consumers: the vendor's own card, and the data-export PDF. No
--    client, no search RPC and no public page has ever read it. Meanwhile the
--    real priced offer — tiers, lines, discount, tax — lives in
--    `quote_templates` and is what the market actually sees.
--
--    So the vendor typed a number, saw it echoed back on their own screen, and
--    it went nowhere. Worse, it could disagree with the packages hanging off
--    that same service, and the vendor had no way to tell which one a client
--    was reading.
--
-- 3. `pricing_model` was declared and never written.
--    The column has existed on `vendor_services` since 0004 and is NULL on
--    every row, because nothing has ever set it.
--
-- WHAT THIS CHANGES IT INTO
--
--   A SERVICE is what a vendor DOES.        Photography. Catering. Decor.
--   A PACKAGE is what it COSTS.             Silver / Gold / Platinum, priced.
--
-- A service therefore carries a category (its place in the platform's
-- taxonomy) and the set of pricing models the vendor is willing to work under
-- for that kind of work — a photographer takes fixed-price weddings AND
-- hourly corporate work, and saying so is a fact about the service, not about
-- any one package.
--
-- A package then declares WHICH ONE of those models it is sold under, so a
-- client scanning a vendor's profile can pick the package that suits how they
-- want to be charged rather than reading every line item to work it out.
--
--   vendor_services.pricing_models   pricing_model[]   what I will do
--     └─ quote_templates.pricing_model  pricing_model   how THIS one is sold
--
-- `base_price` and `currency` are left on `vendor_services` untouched. They
-- are not dropped: the data-export document still reads them for historical
-- rows, and a column that is merely no longer written is reversible in a way
-- that a dropped one is not. The vendor portal simply stops writing them, and
-- the service card now derives its "from" figure from the cheapest published
-- package tier — the same arithmetic (`packagePricing`) that produces the
-- number the client is shown, so the two cannot drift.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CATEGORY — keep the constraint, remove the way to trip it
--
-- The constraint is right: an uncategorised service is invisible to
-- `public_home_rpc` and `public_vendor_search_rpc`, both of which join
-- `service_categories` to build a vendor's category list. Relaxing it would
-- trade a loud error for a service that silently never appears in search.
--
-- So the fix is a default rather than a relaxation. A vendor who omits a
-- category gets their own `vendors.primary_category_id` — the category they
-- were approved under, which is the only sensible guess and is exactly what a
-- vendor listing their first service means. The portal still asks explicitly;
-- this is the floor beneath the form, not a replacement for it.
--
-- BEFORE INSERT rather than a column DEFAULT because the value depends on
-- another table and on the row being inserted. It fires only when the column
-- is null, so an explicit category is never overwritten.
-- ---------------------------------------------------------------------
create or replace function public.tg_vendor_services_default_category()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category_id is null then
    select v.primary_category_id
      into new.category_id
      from public.vendors v
     where v.id = new.vendor_id;
  end if;

  -- A vendor approved without a primary category would otherwise hit the raw
  -- not-null violation again. Raising here gives the portal a token it can
  -- turn into a sentence naming the control the vendor has to use.
  if new.category_id is null then
    raise exception 'service_category_required';
  end if;

  return new;
end;$$;

drop trigger if exists trg_vendor_services_default_category on public.vendor_services;
create trigger trg_vendor_services_default_category
  before insert on public.vendor_services
  for each row execute function public.tg_vendor_services_default_category();

-- ---------------------------------------------------------------------
-- 2. PRICING MODELS ON A SERVICE
--
-- An array rather than a child table. The domain is a four-value enum that
-- has not changed since 0001, every read wants the whole set at once, and
-- `quote_templates` already stores `inclusions`/`exclusions` as arrays for the
-- same reason — a join table here would buy normalisation nobody queries and
-- cost a second write on every service save.
--
-- Defaults to `'{}'` rather than to a guessed model. An empty set means "this
-- vendor has not said yet", which is the truth for every row that exists
-- today; inventing `fixed` for them would put a claim on their public profile
-- that they never made. The portal requires at least one on new services, so
-- the empty set is a legacy state that drains rather than a valid new one.
-- ---------------------------------------------------------------------
alter table public.vendor_services
  add column if not exists pricing_models public.pricing_model[] not null default '{}';

-- The scalar `pricing_model` column stays where it is and is carried forward,
-- so nothing that reads it breaks. It is no longer the source of truth.
update public.vendor_services
   set pricing_models = array[pricing_model]
 where pricing_model is not null
   and cardinality(pricing_models) = 0;

-- No duplicates: `{fixed,fixed}` renders as two identical chips and means
-- nothing more than `{fixed}`. Checked in the database because the portal is
-- not the only writer — the data importer and any future admin tool post here
-- too.
-- Wrapped in a function because a CHECK constraint may not contain a
-- subquery, and de-duplicating an array needs one. Immutable, so the planner
-- may cache it and so the constraint is legal to declare.
create or replace function public.pricing_models_are_distinct(p public.pricing_model[])
returns boolean language sql immutable set search_path = public as $$
  select cardinality(p) = (select count(distinct m) from unnest(p) as m);
$$;

alter table public.vendor_services
  drop constraint if exists ck_vendor_services_pricing_models_distinct;
alter table public.vendor_services
  add constraint ck_vendor_services_pricing_models_distinct
  check (public.pricing_models_are_distinct(pricing_models));

-- ---------------------------------------------------------------------
-- 3. PRICING MODEL ON A PACKAGE
--
-- Singular, because a package IS one way of being charged. A vendor who sells
-- the same work fixed-price and by the hour publishes two packages, and the
-- client picks between two cards rather than configuring one.
--
-- Nullable at the column level, required by `save_quote_package`. The
-- constraint lives in the RPC rather than in the schema so that the packages
-- that already exist stay readable while their vendors are being asked to
-- declare a model on the next edit — a `not null` here would have made every
-- pre-existing package unreadable the moment this migration ran.
-- ---------------------------------------------------------------------
alter table public.quote_templates
  add column if not exists pricing_model public.pricing_model;

-- Existing packages inherit the model from the service they hang off when
-- that service offers exactly one — an unambiguous answer, filled in so the
-- vendor is not asked to restate something already known. A service offering
-- several, or none, leaves the package null and the vendor chooses on the
-- next save.
update public.quote_templates t
   set pricing_model = s.pricing_models[1]
  from public.vendor_services s
 where t.pricing_model is null
   and t.vendor_service_id = s.id
   and cardinality(s.pricing_models) = 1;

-- The filter a client browsing a vendor's profile applies. Partial on the
-- published predicate for the same reason `ix_quote_templates_public` is:
-- drafts are never in this listing.
create index if not exists ix_quote_templates_pricing_model
  on public.quote_templates(vendor_id, pricing_model)
  where visibility = 'public'::public.package_visibility
    and is_active and deleted_at is null and admin_unpublished_at is null;

-- ---------------------------------------------------------------------
-- 4. save_quote_package — now carries and validates the pricing model
--
-- Two new refusals, both of which a form can and does prevent, and both of
-- which are checked here anyway because PostgREST is not the only door:
--
--   package_pricing_model_required   — a package with no declared model would
--                                      publish a card with no answer to "how
--                                      am I charged for this?".
--   pricing_model_not_offered        — an hourly package hanging off a service
--                                      the vendor has declared fixed-price
--                                      only. The service is the vendor's own
--                                      statement about what they will do; a
--                                      package contradicting it is an error in
--                                      one of the two, and the vendor should
--                                      be told rather than have the platform
--                                      pick a winner.
--
-- A package with no linked service accepts any model — there is nothing to
-- contradict. A service that has declared no models yet (a legacy row) also
-- accepts any: an empty set is "not stated", not "nothing allowed", and
-- refusing on it would lock vendors out of their own packages.
--
-- Everything else in this function is unchanged from 0823b.
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
  v_tier_id     uuid;
  v_keep        uuid[] := '{}';
  v_recommended uuid;
  v_max_rate    numeric;
  v_max_days    int;
  v_tax_rate    numeric := coalesce((p_package->>'tax_rate')::numeric, 0);
  v_adv_rate    numeric := nullif(p_package->>'advance_rate', '')::numeric;
  v_adv_days    int     := nullif(p_package->>'advance_release_days_before', '')::int;
  v_service_id  uuid    := nullif(p_package->>'vendor_service_id', '')::uuid;
  v_model       public.pricing_model
                        := nullif(p_package->>'pricing_model', '')::public.pricing_model;
  v_offered     public.pricing_model[];
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
  if v_model is null then
    raise exception 'package_pricing_model_required';
  end if;

  -- The linked service must be this vendor's own. Without the check a vendor
  -- could hang their package off a competitor's service id and inherit its
  -- category on the public profile.
  if v_service_id is not null then
    select s.pricing_models
      into v_offered
      from public.vendor_services s
     where s.id = v_service_id
       and s.vendor_id = p_vendor_id
       and s.deleted_at is null;
    if not found then
      raise exception 'service_not_found';
    end if;
    if cardinality(v_offered) > 0 and not (v_model = any(v_offered)) then
      raise exception 'pricing_model_not_offered: %', v_model;
    end if;
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
      pricing_model, inclusions, exclusions, lead_time_days, tax_rate, tax_inclusive, valid_days,
      advance_rate, advance_release_days_before, advance_terms_note, is_active, sort_order)
    values (
      p_vendor_id,
      btrim(p_package->>'name'),
      nullif(btrim(coalesce(p_package->>'summary', '')), ''),
      nullif(btrim(coalesce(p_package->>'notes', '')), ''),
      coalesce(nullif(p_package->>'currency', ''), 'UGX'),
      nullif(btrim(coalesce(p_package->>'cover_image_url', '')), ''),
      v_service_id,
      nullif(p_package->>'category_id', '')::uuid,
      v_model,
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
      vendor_service_id = v_service_id,
      category_id       = nullif(p_package->>'category_id', '')::uuid,
      pricing_model     = v_model,
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
-- 5. duplicate_quote_package — carry the model onto the copy
--
-- The column list here is explicit, so a column added to the table and not to
-- this function silently drops off every duplicate. That is what would have
-- happened to `pricing_model`: a vendor duplicating an hourly package would
-- get a copy with no model, and the first save would be refused by a rule they
-- did not break.
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
    pricing_model, inclusions, exclusions, lead_time_days, tax_rate, tax_inclusive, valid_days,
    advance_rate, advance_release_days_before, advance_terms_note, is_active, sort_order, visibility)
  values (
    t.vendor_id, left(t.name || ' (copy)', 120), t.summary, t.notes, t.currency, t.cover_image_url,
    t.vendor_service_id, t.category_id, t.pricing_model, t.inclusions, t.exclusions, t.lead_time_days,
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

-- `create or replace` preserves grants, so the two functions above keep the
-- `authenticated` grant 0823b gave them. Restated for the reader who arrives
-- here first and would otherwise have to go and check.
grant execute on function
  public.save_quote_package(uuid, jsonb, jsonb, jsonb),
  public.duplicate_quote_package(uuid)
to authenticated;
