-- ============================================================================
-- Business logo on every document a vendor sends, and required before sending.
--
-- The logo is `vendors.primary_image_url` — the "Business logo" the vendor
-- already manages on their Profile. No new column: one image, one place.
--
-- 1. `_vendor_snapshot` prints that logo, and only that logo. It used to
--    prefer `profile_image_url` (the onboarding photo, often a headshot).
--    Snapshots already frozen onto issued documents are left as they are:
--    a document stays exactly what the client received.
--
-- 2. Triggers refuse the moments a vendor sends something new to a client
--    when no logo is set:
--      - a quotation leaving requested/draft for sent (send / revise), or
--        for accepted (approving a package order);
--      - an invoice leaving draft (issue);
--      - a receipt being recorded.
--    Triggers rather than edits to `send_quotation`, `issue_invoice`,
--    `record_receipt` and `respond_package_quotation`: those are long
--    functions with grants and ordering already reasoned about, and the rule
--    is the same at all four. A client accepting a sent quote (sent ->
--    accepted) and every system transition (paid, void, expired) are untouched.
--
-- The UI asks for the logo before it ever reaches these; the triggers are what
-- make the rule true for every caller.
-- ============================================================================

create or replace function public._vendor_has_logo(p_vendor_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.vendors v
     where v.id = p_vendor_id
       and coalesce(btrim(v.primary_image_url), '') <> ''
  );
$$;

create or replace function public._assert_vendor_has_logo(p_vendor_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public._vendor_has_logo(p_vendor_id) then
    raise exception 'logo_required: add your business logo before sending documents to clients'
      using errcode = 'P0001';
  end if;
end;$$;

-- ---------------------------------------------------------------------------
-- 1. The snapshot prints the business logo only.
-- ---------------------------------------------------------------------------
create or replace function public._vendor_snapshot(p_vendor_id uuid, p_show_tax_id boolean, p_include_email boolean)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'business_name',   v.business_name,
           'logo_url',        nullif(btrim(v.primary_image_url), ''),
           'location',        nullif(btrim(v.business_location), ''),
           'city',            nullif(btrim(v.base_city), ''),
           'phone',           nullif(btrim(p.phone), ''),
           'website',         nullif(btrim(v.website), ''),
           'registration_no', nullif(btrim(v.business_reg_number), ''),
           'tax_id',          case when p_show_tax_id then nullif(btrim(v.tax_id), '') end,
           'email',           case when p_include_email then p.email::text end))
    from public.vendors v
    join public.profiles p on p.id = v.owner_id
   where v.id = p_vendor_id;
$$;

-- ---------------------------------------------------------------------------
-- 2. The send-time checks.
-- ---------------------------------------------------------------------------
create or replace function public.tg_quotation_requires_logo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Sending, approving a package order, or re-sending a revision (which
  -- `send_quotation` writes onto the same row with a fresh `sent_at`).
  if (new.status in ('sent', 'accepted') and old.status in ('requested', 'draft', 'revised'))
     or (new.status = 'sent' and new.sent_at is distinct from old.sent_at) then
    perform public._assert_vendor_has_logo(new.vendor_id);
  end if;
  return new;
end;$$;

drop trigger if exists trg_quotation_requires_logo on public.quotations;
create trigger trg_quotation_requires_logo
  before update of status, sent_at on public.quotations
  for each row execute function public.tg_quotation_requires_logo();

create or replace function public.tg_invoice_requires_logo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'draft'
     and (tg_op = 'INSERT' or old.status = 'draft') then
    perform public._assert_vendor_has_logo(new.vendor_id);
  end if;
  return new;
end;$$;

drop trigger if exists trg_invoice_requires_logo on public.vendor_invoices;
create trigger trg_invoice_requires_logo
  before insert or update of status on public.vendor_invoices
  for each row execute function public.tg_invoice_requires_logo();

create or replace function public.tg_receipt_requires_logo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_vendor_has_logo(new.vendor_id);
  return new;
end;$$;

drop trigger if exists trg_receipt_requires_logo on public.vendor_receipts;
create trigger trg_receipt_requires_logo
  before insert on public.vendor_receipts
  for each row execute function public.tg_receipt_requires_logo();

-- ---------------------------------------------------------------------------
-- Internal only. Re-issued on every recreate: Supabase's default privileges
-- hand EXECUTE back to anon/authenticated when a function is (re)created.
-- ---------------------------------------------------------------------------
revoke all on function public._vendor_has_logo(uuid)                       from public, anon, authenticated;
revoke all on function public._assert_vendor_has_logo(uuid)                from public, anon, authenticated;
revoke all on function public._vendor_snapshot(uuid, boolean, boolean)     from public, anon, authenticated;
revoke all on function public.tg_quotation_requires_logo()                 from public, anon, authenticated;
revoke all on function public.tg_invoice_requires_logo()                   from public, anon, authenticated;
revoke all on function public.tg_receipt_requires_logo()                   from public, anon, authenticated;
