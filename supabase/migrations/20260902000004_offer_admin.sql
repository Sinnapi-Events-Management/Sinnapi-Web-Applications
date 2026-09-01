-- =====================================================================
-- Sinnapi — 0902d Offers: the console's reach over them
--
-- WHY THE CONSOLE NEEDS ONE AT ALL
-- Every other thing a vendor publishes to the market can be taken off it. A
-- package has `admin_unpublish_quote_package`, a vendor has suspension, a
-- review has moderation, a message has flags. A promotion — the one surface
-- whose entire purpose is to make a price claim to the public — had nothing.
-- `discounts.manage` has existed in the permission catalogue since 0012 with
-- no RPC behind it and no screen that reads it.
--
-- Now that offers reach the marketing site and the client portal, a vendor can
-- advertise "70% off" on a page Google indexes. The console has to be able to
-- stop that inside a minute, and to say on the record why.
--
-- SUSPEND, NOT EDIT — the same line 0823b drew on packages
-- An operator can take an offer off the market. They cannot rewrite what it
-- says. An offer is a vendor's commercial claim; the console's job is to
-- refuse to carry a bad one, not to author a better one. So there is no
-- `admin_update_discount` here, and there will not be.
--
-- WHY SUSPENSION IS A SEPARATE COLUMN FROM `is_active`
-- `is_active` is the vendor's own pause switch and the vendor portal writes it
-- freely. If moderation used the same column, the vendor's next "resume" would
-- silently undo the operator's decision. `admin_suspended_at` is invisible to
-- `promos_write` / `discounts_write` — both go through PostgREST and neither
-- policy can restrict a column — so the RPCs below are `security definer` and
-- the guard that matters is that `discount_is_live` tests the column, not that
-- the vendor is politely asked not to write it.
--
-- FEATURING IS THE POSITIVE ACTION
-- A moderation surface whose only verb is "suspend" is a surface an operator
-- opens once a quarter. Featuring puts a campaign at the top of the public
-- offers directory, which is a thing the business actually wants to do and the
-- reason this screen gets opened on an ordinary day.
-- =====================================================================

-- ---------------------------------------------------------------------
-- THE PERMISSION
--
-- New rather than reusing `discounts.manage`, which reads as — and in 0011's
-- `discounts_write` literally is — the right to AUTHOR platform-wide discount
-- rows. Taking a vendor's campaign down is a different job that a support
-- moderator should be able to hold without also being able to mint codes.
--
-- Both are accepted by every function below, so nobody who can do this today
-- loses the ability tomorrow.
-- ---------------------------------------------------------------------
insert into public.permissions(key, category, description) values
  ('offers.moderate', 'operations', 'Suspend or feature vendor promotions and discount offers')
on conflict (key) do nothing;

-- Super Admin's blanket grant in 0012 was a one-off cross join, so every
-- permission added later has to be granted explicitly.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key = 'offers.moderate'
where r.key in ('super_admin', 'support')
on conflict do nothing;

create or replace function public.can_moderate_offers()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission('offers.moderate') or public.has_permission('discounts.manage');
$$;

-- ---------------------------------------------------------------------
-- THE CONSOLE'S LIST
--
-- One row per discount with its campaign folded in, because that is the unit a
-- complaint arrives about ("this vendor is advertising 70% off") and the unit
-- suspension acts on.
--
-- `status` is derived, not stored, and is the same vocabulary the vendor's own
-- screen uses. An operator and a vendor looking at the same campaign must not
-- read two different words for its state.
--
-- Deleted rows are excluded and suspended ones are not: a suspended offer is
-- the main thing this screen exists to show, and hiding it would mean an
-- operator could suspend something and then not find it to reverse.
-- ---------------------------------------------------------------------
create or replace function public.admin_search_offers(
  p_status  text default null,
  p_search  text default null,
  p_vendor_id uuid default null,
  p_limit   integer default 25,
  p_offset  integer default 0)
returns table (
  discount_id        uuid,
  promotion_id       uuid,
  promotion_public_id text,
  promotion_title    text,
  vendor_id          uuid,
  vendor_name        text,
  vendor_slug        text,
  vendor_public_id   text,
  title              text,
  description        text,
  code               text,
  is_automatic       boolean,
  type               text,
  value              numeric,
  currency           text,
  min_amount         numeric,
  max_discount_amount numeric,
  max_uses           integer,
  max_per_client     integer,
  starts_at          timestamptz,
  ends_at            timestamptz,
  status             text,
  is_featured        boolean,
  admin_suspended_at timestamptz,
  admin_suspended_reason text,
  package_count      integer,
  package_names      text[],
  reserved_count     integer,
  redeemed_count     integer,
  discounted_value   numeric,
  total_count        bigint)
language sql stable security definer set search_path = public as $$
  with allowed as (select public.can_moderate_offers() as ok),
  rows_ as (
    select d.*,
           p.title      as promo_title,
           p.public_id  as promo_public_id,
           p.description as promo_description,
           (p.featured_at is not null) as featured,
           v.business_name, v.slug, v.public_id as vendor_public_id,
           case
             when d.deleted_at is not null         then 'deleted'
             when d.admin_suspended_at is not null then 'suspended'
             when not d.is_active                  then 'paused'
             when d.starts_at > now()              then 'scheduled'
             when d.ends_at   < now()              then 'ended'
             when coalesce(public.discount_remaining_uses(d.id), 1) <= 0 then 'exhausted'
             else 'live'
           end as derived_status
      from public.discounts d
      left join public.promotions p on p.id = d.promotion_id
      left join public.vendors    v on v.id = d.vendor_id
     where d.deleted_at is null
       and (select ok from allowed)
  )
  select r.id, r.promotion_id, r.promo_public_id, r.promo_title,
         r.vendor_id, r.business_name, r.slug, r.vendor_public_id,
         coalesce(r.title, r.code, r.promo_title, 'Special offer'),
         coalesce(r.description, r.promo_description),
         r.code, r.is_automatic, r.type::text, r.value, r.currency,
         r.min_amount, r.max_discount_amount, r.max_uses, r.max_per_client,
         r.starts_at, r.ends_at, r.derived_status, r.featured,
         r.admin_suspended_at, r.admin_suspended_reason,
         (select count(*)::int from public.quote_templates t
           where t.vendor_id = r.vendor_id and t.deleted_at is null
             and public.offer_targets_package(null, r.id, t.id, null)),
         (select array_agg(t.name order by t.name) from public.quote_templates t
           where t.vendor_id = r.vendor_id and t.deleted_at is null
             and public.offer_targets_package(null, r.id, t.id, null)),
         (select count(*)::int from public.discount_redemptions x
           where x.discount_id = r.id and x.status = 'reserved'),
         (select count(*)::int from public.discount_redemptions x
           where x.discount_id = r.id and x.status = 'redeemed'),
         (select coalesce(sum(x.amount_applied), 0) from public.discount_redemptions x
           where x.discount_id = r.id and x.status = 'redeemed'),
         count(*) over ()
    from rows_ r
   where (p_vendor_id is null or r.vendor_id = p_vendor_id)
     and (nullif(btrim(coalesce(p_status, '')), '') is null
          or p_status = 'all'
          or r.derived_status = p_status)
     and (nullif(btrim(coalesce(p_search, '')), '') is null
          or coalesce(r.title, '')         ilike '%' || btrim(p_search) || '%'
          or coalesce(r.code, '')          ilike '%' || btrim(p_search) || '%'
          or coalesce(r.promo_title, '')   ilike '%' || btrim(p_search) || '%'
          or coalesce(r.business_name, '') ilike '%' || btrim(p_search) || '%')
   order by (r.derived_status = 'live') desc, r.ends_at asc
   limit  greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- ---------------------------------------------------------------------
-- THE COUNTS BEHIND THE FILTER TABS
--
-- Separate from the list so the tabs keep their numbers when the list is
-- filtered to one of them — a tab bar whose counts change as you click it
-- cannot be used to navigate.
-- ---------------------------------------------------------------------
create or replace function public.admin_offer_counts()
returns table (status text, count bigint)
language sql stable security definer set search_path = public as $$
  select s.status, count(d.id)
    from (values ('live'), ('scheduled'), ('paused'), ('suspended'),
                 ('ended'), ('exhausted')) as s(status)
    left join public.discounts d
      on d.deleted_at is null
     and s.status = case
           when d.admin_suspended_at is not null then 'suspended'
           when not d.is_active                  then 'paused'
           when d.starts_at > now()              then 'scheduled'
           when d.ends_at   < now()              then 'ended'
           when coalesce(public.discount_remaining_uses(d.id), 1) <= 0 then 'exhausted'
           else 'live'
         end
   where public.can_moderate_offers()
   group by s.status;
$$;

-- ---------------------------------------------------------------------
-- TAKING AN OFFER DOWN, AND PUTTING IT BACK
--
-- One function for both directions rather than a suspend/restore pair,
-- because the two share every guard and differ only in which timestamp is
-- written — and a pair is how a restore ends up missing the notification the
-- suspend sends.
--
-- The reason is mandatory on suspension and shown to the vendor unchanged. A
-- take-down with no stated reason is one the vendor cannot fix and support
-- cannot defend.
--
-- Idempotent on the target state: two operators reaching the same conclusion
-- about the same offer is the expected case, not an error.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_discount_suspended(
  p_discount_id uuid,
  p_suspended   boolean,
  p_reason      text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  d        public.discounts;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_owner  uuid;
begin
  if not public.can_moderate_offers() then perform public._forbidden(); end if;

  select * into d from public.discounts where id = p_discount_id and deleted_at is null;
  if d.id is null then raise exception 'not_found'; end if;

  if p_suspended then
    if v_reason is null then raise exception 'reason_required'; end if;
    if length(v_reason) > 500 then raise exception 'reason_too_long'; end if;
  end if;

  if (d.admin_suspended_at is not null) = p_suspended then return; end if;

  update public.discounts
     set admin_suspended_at     = case when p_suspended then now() end,
         admin_suspended_by     = case when p_suspended then auth.uid() end,
         admin_suspended_reason = case when p_suspended then v_reason end,
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_discount_id;

  -- Live reservations are NOT released. A client who was quoted a price under
  -- this offer keeps that price: the vendor committed it and the client may
  -- already have accepted. Moderation stops the offer being handed out again;
  -- it does not reach back into a deal that was already struck.

  select v.owner_id into v_owner from public.vendors v where v.id = d.vendor_id;
  if v_owner is not null then
    insert into public.notifications(recipient_id, trigger_key, channel, title, body, data)
    values (
      v_owner,
      case when p_suspended then 'offer.suspended.vendor' else 'offer.restored.vendor' end,
      'in_app',
      case when p_suspended then 'An offer was taken off your profile'
           else 'An offer is back on your profile' end,
      case when p_suspended
           then format('“%s” is no longer shown to clients. Reason: %s',
                       coalesce(d.title, d.code, 'Your offer'), v_reason)
           else format('“%s” has been restored and is visible to clients again.',
                       coalesce(d.title, d.code, 'Your offer')) end,
      jsonb_build_object('discount_id', d.id, 'promotion_id', d.promotion_id));
  end if;
end;$$;

create or replace function public.admin_set_promotion_suspended(
  p_promotion_id uuid,
  p_suspended    boolean,
  p_reason       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  p        public.promotions;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_owner  uuid;
begin
  if not public.can_moderate_offers() then perform public._forbidden(); end if;

  select * into p from public.promotions where id = p_promotion_id and deleted_at is null;
  if p.id is null then raise exception 'not_found'; end if;

  if p_suspended then
    if v_reason is null then raise exception 'reason_required'; end if;
    if length(v_reason) > 500 then raise exception 'reason_too_long'; end if;
  end if;

  if (p.admin_suspended_at is not null) = p_suspended then return; end if;

  update public.promotions
     set admin_suspended_at     = case when p_suspended then now() end,
         admin_suspended_by     = case when p_suspended then auth.uid() end,
         admin_suspended_reason = case when p_suspended then v_reason end,
         -- A suspended campaign cannot also be featured. Leaving the two
         -- independent is how a taken-down campaign stays at the top of the
         -- public directory with its own codes switched off.
         featured_at = case when p_suspended then null else featured_at end,
         featured_by = case when p_suspended then null else featured_by end,
         updated_at = now(),
         updated_by = auth.uid()
   where id = p_promotion_id;

  -- Every code under the campaign follows it off the market. Not by writing
  -- their columns — `discount_is_live` already tests the campaign — which is
  -- why suspending a campaign does not have to touch a single discount row and
  -- cannot leave one behind.

  select v.owner_id into v_owner from public.vendors v where v.id = p.vendor_id;
  if v_owner is not null then
    insert into public.notifications(recipient_id, trigger_key, channel, title, body, data)
    values (
      v_owner,
      case when p_suspended then 'promotion.suspended.vendor' else 'promotion.restored.vendor' end,
      'in_app',
      case when p_suspended then 'A campaign was taken off your profile'
           else 'A campaign is back on your profile' end,
      case when p_suspended
           then format('“%s” and every code under it are no longer shown to clients. Reason: %s',
                       p.title, v_reason)
           else format('“%s” has been restored. Its codes are live again.', p.title) end,
      jsonb_build_object('promotion_id', p.id));
  end if;
end;$$;

-- ---------------------------------------------------------------------
-- FEATURING
--
-- Only a live campaign can be featured. Featuring a suspended or expired one
-- would put a dead card at the top of the public directory, which is the
-- single most visible thing this console can get wrong.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_promotion_featured(
  p_promotion_id uuid,
  p_featured     boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  p public.promotions;
begin
  if not public.can_moderate_offers() then perform public._forbidden(); end if;

  select * into p from public.promotions where id = p_promotion_id and deleted_at is null;
  if p.id is null then raise exception 'not_found'; end if;

  if p_featured and not public.promotion_is_live(p_promotion_id) then
    raise exception 'promotion_not_live';
  end if;

  if (p.featured_at is not null) = p_featured then return; end if;

  update public.promotions
     set featured_at = case when p_featured then now() end,
         featured_by = case when p_featured then auth.uid() end,
         updated_at  = now(),
         updated_by  = auth.uid()
   where id = p_promotion_id;
end;$$;

-- ---------------------------------------------------------------------
-- COPY for the notifications this migration introduces.
--
-- In-app only, matching `quote_package.unpublished.vendor` from 0823b. A
-- moderation decision is not a deadline: the vendor sees it the next time they
-- open the portal, which is where they have to go to act on it anyway.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
('offer.suspended.vendor', 'in_app', '“{{offer_title}}” was taken off your profile',
 'A moderator has stopped this offer being shown to clients. Reason: {{reason}}. Quotes already sent with it are unaffected. Edit the offer and contact support once the issue is resolved.', 'en'),
('offer.restored.vendor', 'in_app', '“{{offer_title}}” is live again',
 'A moderator has restored this offer. Clients can see it and use it from now on.', 'en'),
('promotion.suspended.vendor', 'in_app', '“{{promotion_title}}” was taken off your profile',
 'A moderator has stopped this campaign and every code under it being shown to clients. Reason: {{reason}}. Quotes already sent under it are unaffected.', 'en'),
('promotion.restored.vendor', 'in_app', '“{{promotion_title}}” is live again',
 'A moderator has restored this campaign. Its codes work again from now on.', 'en')
on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;

-- ---------------------------------------------------------------------
-- GRANTS. Each function checks `can_moderate_offers` itself, so a signed-in
-- session may call one and an unprivileged one gets a refusal rather than an
-- effect — the same arrangement every admin RPC on this platform uses.
-- ---------------------------------------------------------------------
grant execute on function
  public.can_moderate_offers(),
  public.admin_search_offers(text, text, uuid, integer, integer),
  public.admin_offer_counts(),
  public.admin_set_discount_suspended(uuid, boolean, text),
  public.admin_set_promotion_suspended(uuid, boolean, text),
  public.admin_set_promotion_featured(uuid, boolean)
to authenticated;
