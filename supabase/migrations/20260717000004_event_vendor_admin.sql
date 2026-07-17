-- =====================================================================
-- Sinnapi — 0717 Event ↔ Vendor admin engagement
-- Everything the admin Event Detail page needs to work the vendors who
-- engaged with an event: the two list reads (expressed interest / submitted
-- quotations), the approve/reject decision, the single-quotation read behind
-- the PDF download, and the event-scoped vendor⇄admin chat thread.
--
-- Why RPCs rather than direct table access: the RLS in 0011 lets an admin
-- READ `event_interests` (is_admin) but NOT write it (interests_write is
-- vendor-owner only), never lets an events-admin touch `quotations`
-- (quotations_* are client/vendor-owner or `quotations.read`), and never
-- exposes `quotation_items` to an admin at all. So every write here — and the
-- item-level read the PDF needs — goes through a SECURITY DEFINER function
-- gated on `events.manage`, the same permission that guards the page and the
-- 0717 events search. Reads follow suit so the whole page works off one
-- permission regardless of what finance/quotation grants an admin also holds.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Link a conversation to the event it is about. Admin↔vendor chat started
-- from an event detail page carries the event id so the thread stays scoped
-- to (and re-findable from) that event. Nullable + ON DELETE SET NULL: every
-- existing conversation and all non-event chat keep working unchanged.
-- ---------------------------------------------------------------------
alter table public.conversations
  add column if not exists event_id uuid references public.events(id) on delete set null;
create index if not exists ix_conversations_event on public.conversations(event_id);

-- ---------------------------------------------------------------------
-- search_event_interests
-- One page of the vendors who expressed interest in an event, newest first,
-- with a window `total_count` so the caller paginates in a single round trip.
-- Sort inputs are whitelisted before interpolation (they are identifiers).
-- ---------------------------------------------------------------------
create or replace function public.search_event_interests(
  p_event_id   uuid,
  p_status     text    default null,
  p_sort_field text    default 'created_at',
  p_sort_dir   text    default 'desc',
  p_limit      integer default 25,
  p_offset     integer default 0)
returns table (
  id                uuid,
  vendor_id         uuid,
  business_name     text,
  profile_image_url text,
  base_city         text,
  message           text,
  status            interest_status,
  created_at        timestamptz,
  total_count       bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;

  v_sort_field := case
    when p_sort_field in ('created_at','business_name','status') then p_sort_field
    else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'asc' then 'asc' else 'desc' end;

  return query execute format($q$
    select ei.id, ei.vendor_id, v.business_name, v.profile_image_url, v.base_city,
           ei.message, ei.status, ei.created_at,
           count(*) over() as total_count
    from public.event_interests ei
    join public.vendors v on v.id = ei.vendor_id
    where ei.event_id = $1
      and ($2 is null or ei.status = $2::interest_status)
    order by %s %s
    limit $3 offset $4
  $q$,
    case v_sort_field when 'business_name' then 'v.business_name' else 'ei.'||v_sort_field end,
    v_sort_dir)
  using p_event_id, p_status, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- search_event_quotations
-- One page of the quotations submitted against an event, joined to the
-- vendor that owns each. Same window-count pagination contract as above.
-- ---------------------------------------------------------------------
create or replace function public.search_event_quotations(
  p_event_id   uuid,
  p_status     text    default null,
  p_sort_field text    default 'created_at',
  p_sort_dir   text    default 'desc',
  p_limit      integer default 25,
  p_offset     integer default 0)
returns table (
  id            uuid,
  vendor_id     uuid,
  business_name text,
  reference_no  text,
  status        quotation_status,
  currency      text,
  total         numeric,
  sent_at       timestamptz,
  created_at    timestamptz,
  total_count   bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;

  v_sort_field := case
    when p_sort_field in ('created_at','sent_at','reference_no','status','total','business_name')
      then p_sort_field else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'asc' then 'asc' else 'desc' end;

  return query execute format($q$
    select q.id, q.vendor_id, v.business_name, q.reference_no, q.status, q.currency,
           q.total, q.sent_at, q.created_at,
           count(*) over() as total_count
    from public.quotations q
    join public.vendors v on v.id = q.vendor_id
    where q.event_id = $1
      and q.deleted_at is null
      and ($2 is null or q.status = $2::quotation_status)
    order by %s %s
    limit $3 offset $4
  $q$,
    case v_sort_field when 'business_name' then 'v.business_name' else 'q.'||v_sort_field end,
    v_sort_dir)
  using p_event_id, p_status, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- event_engagement_counts
-- Headline counts for the detail page's KPI row: how many vendors expressed
-- interest, how many were shortlisted, and how many quotations arrived. One
-- row, one round trip; `quotations` is counted here (not client-side) because
-- an events-admin has no direct read on the quotations table.
-- ---------------------------------------------------------------------
create or replace function public.event_engagement_counts(p_event_id uuid)
returns table (interested bigint, shortlisted bigint, declined bigint, quotations bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;

  return query
    select
      (select count(*) from public.event_interests ei where ei.event_id = p_event_id),
      (select count(*) from public.event_interests ei
         where ei.event_id = p_event_id and ei.status = 'shortlisted'),
      (select count(*) from public.event_interests ei
         where ei.event_id = p_event_id and ei.status = 'declined'),
      (select count(*) from public.quotations q
         where q.event_id = p_event_id and q.deleted_at is null);
end;
$$;

-- ---------------------------------------------------------------------
-- get_event_quotation
-- The full quotation behind the "Download quotation" action, as one jsonb
-- document: header, the vendor/client names, the event title and every line
-- item. This is the only path by which an events-admin can read
-- `quotation_items` (RLS keeps that table to the client and vendor owner).
-- ---------------------------------------------------------------------
create or replace function public.get_event_quotation(p_quotation_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_doc jsonb;
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;

  select jsonb_build_object(
    'id', q.id,
    'reference_no', q.reference_no,
    'status', q.status,
    'currency', q.currency,
    'subtotal', q.subtotal,
    'discount_total', q.discount_total,
    'tax_total', q.tax_total,
    'total', q.total,
    'valid_until', q.valid_until,
    'request_details', q.request_details,
    'sent_at', q.sent_at,
    'created_at', q.created_at,
    'vendor_name', vend.business_name,
    'client_name', cli.full_name,
    'event_title', ev.title,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'description', qi.description,
               'quantity', qi.quantity,
               'unit_price', qi.unit_price,
               'line_total', qi.line_total)
             order by qi.sort_order)
      from public.quotation_items qi where qi.quotation_id = q.id), '[]'::jsonb))
  into v_doc
  from public.quotations q
  join public.vendors vend on vend.id = q.vendor_id
  join public.profiles cli on cli.id = q.client_id
  left join public.events ev on ev.id = q.event_id
  where q.id = p_quotation_id and q.deleted_at is null;

  if v_doc is null then raise exception 'quotation_not_found'; end if;
  return v_doc;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_decide_event_vendor
-- The admin's approve / reject decision on a vendor's engagement with an
-- event. Approve shortlists the interest and accepts that vendor's live
-- quotations for the event; reject declines both. Either side may be absent
-- (a vendor can express interest without quoting, or quote without a prior
-- interest row) — each update simply affects zero rows in that case.
-- ---------------------------------------------------------------------
create or replace function public.admin_decide_event_vendor(
  p_event_id uuid, p_vendor_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_interest interest_status;
  v_quote    quotation_status;
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;
  if p_decision not in ('approve','reject') then raise exception 'invalid_decision'; end if;

  v_interest := case p_decision when 'approve' then 'shortlisted' else 'declined' end;
  v_quote    := case p_decision when 'approve' then 'accepted'    else 'declined' end;

  update public.event_interests
     set status = v_interest, updated_at = now()
   where event_id = p_event_id and vendor_id = p_vendor_id;

  -- Only touch quotations that are still open — never re-open or override a
  -- terminal state the two parties already settled between themselves.
  update public.quotations
     set status = v_quote, responded_at = now(), updated_at = now()
   where event_id = p_event_id and vendor_id = p_vendor_id
     and deleted_at is null
     and status in ('requested','draft','sent','revised');
end;
$$;

-- ---------------------------------------------------------------------
-- admin_event_vendor_thread
-- Find (or open) the vendor⇄admin conversation scoped to one event + vendor,
-- returning its id. Idempotent: a second call returns the same thread and
-- guarantees the calling admin is a participant (so the plain participant-gated
-- message insert in the UI is allowed to post). The vendor's owner profile is
-- resolved internally, so callers only pass the event and vendor.
-- ---------------------------------------------------------------------
create or replace function public.admin_event_vendor_thread(
  p_event_id uuid, p_vendor_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_convo uuid;
  v_owner uuid;
  v_title text;
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;
  if auth.uid() is null then perform public._forbidden(); end if;

  select owner_id into v_owner from public.vendors where id = p_vendor_id;
  if v_owner is null then raise exception 'vendor_not_found'; end if;

  select id into v_convo
  from public.conversations
  where type = 'vendor_admin' and event_id = p_event_id and vendor_id = p_vendor_id
    and deleted_at is null
  order by created_at asc
  limit 1;

  if v_convo is null then
    select title into v_title from public.events where id = p_event_id;
    insert into public.conversations(type, subject, vendor_id, event_id, status, created_by)
    values ('vendor_admin', left(coalesce('Re: '||v_title, 'Event enquiry'), 200),
            p_vendor_id, p_event_id, 'active', auth.uid())
    returning id into v_convo;
  end if;

  -- Ensure both parties are participants (no-op on the conflict if already in).
  insert into public.conversation_participants(conversation_id, profile_id, role_in_convo)
  values (v_convo, auth.uid(), 'admin'), (v_convo, v_owner, 'vendor')
  on conflict (conversation_id, profile_id) do nothing;

  return v_convo;
end;
$$;

-- All five are self-gating on `events.manage`; `authenticated` may call them
-- (the blanket grant in 0014 already covers new functions, but be explicit).
grant execute on function
  public.search_event_interests(uuid, text, text, text, integer, integer),
  public.search_event_quotations(uuid, text, text, text, integer, integer),
  public.event_engagement_counts(uuid),
  public.get_event_quotation(uuid),
  public.admin_decide_event_vendor(uuid, uuid, text),
  public.admin_event_vendor_thread(uuid, uuid)
to authenticated;
