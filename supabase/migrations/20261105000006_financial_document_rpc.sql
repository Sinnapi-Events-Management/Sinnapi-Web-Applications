-- =====================================================================
-- Sinnapi — 1105f Vendor invoices & receipts: the write path
--
-- Every change to an invoice or receipt goes through a function in this
-- file. RLS (1105g) grants no direct writes, so these are the only way in,
-- and each one re-derives everything that matters on the server:
--
--   * ownership   — the caller's vendor comes from `current_vendor_id()`,
--                   never from the request
--   * money       — line totals, discount, charges, tax and total are
--                   recomputed here (`_invoice_recompute`); nothing the
--                   browser computed is stored
--   * payment     — an invoice's paid amount is the sum of its live
--                   receipts, re-summed under a row lock on the invoice
--                   every time one is recorded or voided
--
-- THE FORMULA (one implementation; `invoicePricing.ts` mirrors it for the
-- live preview and is tested against it)
--
--   line_total     = round(quantity × unit_price)           per line
--   subtotal       = Σ item lines
--   discount_total = round(subtotal × rate / 100)  or the fixed amount
--   charges_total  = Σ charge lines (transport, service…), not discounted
--   taxable        = subtotal − discount_total + charges_total
--   tax_total      = exclusive: round(taxable × rate / 100)
--                    inclusive: round(taxable − taxable / (1 + rate/100))
--   total          = exclusive: taxable + tax_total; inclusive: taxable
--
-- `round` is to the currency's minor unit (UGX 0 decimals, USD 2), every
-- step, and the total is the sum of rounded parts — never re-rounded.
-- Tax is optional and needs no TIN (confirmed 2026-11-05).
--
-- BOOKING INVOICES (`sinnapi_escrow`) copy their quotation's lines and
-- figures verbatim and lock them: the client pays the booking amount
-- through escrow, so the invoice must say exactly that. 1105h marks them
-- paid from the escrow itself.
--
-- ERRORS are `code: sentence` like the rest of the schema, so the portals'
-- `rpcErrorMessage` can show the sentence.
-- =====================================================================

-- =====================================================================
-- INTERNAL HELPERS (no client role may call these)
-- =====================================================================

create or replace function public._kampala_today()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Africa/Kampala')::date;
$$;

-- Round to the currency's own minor unit. An unknown code rounds to 2dp
-- rather than failing; the foreign key has already refused it by then.
create or replace function public._money_round(p_amount numeric, p_currency text)
returns numeric language sql stable set search_path = public as $$
  select round(p_amount, coalesce((select c.minor_unit from public.currencies c where c.code = p_currency), 2));
$$;

-- A number field from a jsonb payload, with a readable error instead of
-- Postgres's "invalid input syntax for type numeric".
-- Postgres reads 'NaN' and 'Infinity' as numerics, and NaN sorts ABOVE every
-- number — so `amount > 0` would pass it and it would be stored as a payment.
-- Only plain finite decimals get through.
create or replace function public._jnum(p_payload jsonb, p_key text)
returns numeric language plpgsql immutable set search_path = public as $$
declare
  v_raw text := nullif(btrim(p_payload ->> p_key), '');
begin
  if v_raw is null then return null; end if;
  if v_raw !~ '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then
    raise exception 'invalid_number: % must be a number', p_key using errcode = 'P0001';
  end if;
  -- numeric(14,2) tops out just under a trillion; refuse plainly rather than
  -- letting the insert fail with an overflow the vendor cannot read.
  if abs(v_raw::numeric) >= 1000000000000 then
    raise exception 'number_too_large: % is too large', p_key using errcode = 'P0001';
  end if;
  return v_raw::numeric;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'invalid_number: % must be a number', p_key using errcode = 'P0001';
end;$$;

create or replace function public._jdate(p_payload jsonb, p_key text)
returns date language plpgsql immutable set search_path = public as $$
declare
  v_raw text := nullif(btrim(p_payload ->> p_key), '');
begin
  if v_raw is null then return null; end if;
  return v_raw::date;
exception when invalid_datetime_format or datetime_field_overflow then
  raise exception 'invalid_date: % must be a date (YYYY-MM-DD)', p_key using errcode = 'P0001';
end;$$;

create or replace function public._jtext(p_payload jsonb, p_key text)
returns text language sql immutable set search_path = public as $$
  select nullif(btrim(p_payload ->> p_key), '');
$$;

-- `SNP-INV-` / `SNP-RCT-` + 8 digits from pgcrypto's CSPRNG. Bytes of 250
-- and above are discarded (rejection sampling) so every digit is equally
-- likely. Uniqueness is the unique index's job; callers retry on a clash.
create or replace function public._gen_document_no(p_prefix text)
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  v_bytes bytea;
  v_out   text := '';
  v_byte  integer;
  i       integer;
begin
  if p_prefix not in ('SNP-INV', 'SNP-RCT') then
    raise exception '_gen_document_no: unknown prefix %', p_prefix;
  end if;
  while char_length(v_out) < 8 loop
    v_bytes := gen_random_bytes(16);
    for i in 0 .. 15 loop
      exit when char_length(v_out) = 8;
      v_byte := get_byte(v_bytes, i);
      if v_byte < 250 then
        v_out := v_out || (v_byte % 10)::text;
      end if;
    end loop;
  end loop;
  return p_prefix || '-' || v_out;
end;$$;

-- The same predicate `get_vendor_clients` uses: a registered client is one
-- the vendor already has a booking or quotation with.
create or replace function public._vendor_client_eligible(p_vendor_id uuid, p_client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_client_id and p.deleted_at is null
       and p.id <> (select v.owner_id from public.vendors v where v.id = p_vendor_id)
       and (
         exists (select 1 from public.bookings b
                  where b.vendor_id = p_vendor_id and b.client_id = p.id and b.deleted_at is null)
         or exists (select 1 from public.quotations q
                     where q.vendor_id = p_vendor_id and q.client_id = p.id and q.deleted_at is null)
       )
  );
$$;

-- The vendor's business details as printed, frozen onto a document.
-- The TIN only when the vendor ticked "show"; the account email only for
-- external recipients (a registered client reaches the vendor in-app).
create or replace function public._vendor_snapshot(p_vendor_id uuid, p_show_tax_id boolean, p_include_email boolean)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'business_name',   v.business_name,
           'logo_url',        coalesce(v.profile_image_url, v.primary_image_url),
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

-- A registered client's name, and their phone only when the directory
-- would show it to this vendor (engagement live). Called from inside the
-- vendor's own request, so `auth.uid()` is the vendor owner.
create or replace function public._registered_recipient(p_client_id uuid)
returns table (full_name text, phone text)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(d.full_name), ''), 'Client'),
         case when d.contact_visible then nullif(btrim(d.phone), '') end
    from public.get_profile_directory(array[p_client_id]) d
   where d.id = p_client_id;
$$;

-- Find the vendor's saved contact for an external recipient, or save one.
-- Matched on email when there is one, else on name + phone, so a returning
-- client is recognised rather than duplicated.
create or replace function public._match_or_save_contact(
  p_vendor_id uuid, p_name text, p_company text, p_email citext, p_phone text, p_address text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_email is not null then
    select c.id into v_id from public.vendor_contacts c
     where c.vendor_id = p_vendor_id and c.email = p_email and c.deleted_at is null;
  else
    select c.id into v_id from public.vendor_contacts c
     where c.vendor_id = p_vendor_id and c.deleted_at is null and c.email is null
       and lower(c.full_name) = lower(p_name)
       and coalesce(c.phone, '') = coalesce(p_phone, '')
     order by c.created_at
     limit 1;
  end if;

  if v_id is null then
    begin
      insert into public.vendor_contacts (vendor_id, full_name, company_name, email, phone, address, source)
      values (p_vendor_id, p_name, p_company, p_email, p_phone, p_address, 'auto')
      returning id into v_id;
    exception when unique_violation then
      -- A concurrent issue saved the same email a moment ago.
      select c.id into v_id from public.vendor_contacts c
       where c.vendor_id = p_vendor_id and c.email = p_email and c.deleted_at is null;
    end;
  end if;

  return v_id;
end;$$;

-- Recompute a DRAFT's money from its stored lines and rates.
create or replace function public._invoice_recompute(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv        public.vendor_invoices;
  v_subtotal numeric;
  v_charges  numeric;
  v_discount numeric := 0;
  v_taxable  numeric;
  v_tax      numeric := 0;
  v_total    numeric;
begin
  select * into inv from public.vendor_invoices where id = p_invoice_id;

  select coalesce(sum(line_total) filter (where kind = 'item'), 0),
         coalesce(sum(line_total) filter (where kind = 'charge'), 0)
    into v_subtotal, v_charges
    from public.vendor_invoice_items where invoice_id = p_invoice_id;

  if inv.discount_type = 'percentage' then
    v_discount := public._money_round(v_subtotal * inv.discount_value / 100, inv.currency);
  elsif inv.discount_type = 'fixed' then
    v_discount := public._money_round(inv.discount_value, inv.currency);
  end if;

  if v_discount > v_subtotal then
    raise exception 'discount_exceeds_subtotal: the discount is larger than the items it applies to'
      using errcode = 'P0001';
  end if;

  v_taxable := v_subtotal - v_discount + v_charges;

  if inv.tax_rate is not null then
    if inv.tax_inclusive then
      v_tax   := public._money_round(v_taxable - v_taxable / (1 + inv.tax_rate / 100), inv.currency);
      v_total := v_taxable;
    else
      v_tax   := public._money_round(v_taxable * inv.tax_rate / 100, inv.currency);
      v_total := v_taxable + v_tax;
    end if;
  else
    v_total := v_taxable;
  end if;

  if v_subtotal >= 1000000000000 or v_total >= 1000000000000 then
    raise exception 'number_too_large: this invoice total is too large' using errcode = 'P0001';
  end if;

  update public.vendor_invoices
     set subtotal = v_subtotal, discount_total = v_discount, charges_total = v_charges,
         tax_total = v_tax, total = v_total
   where id = p_invoice_id;
end;$$;

-- Re-derive a vendor-collected invoice's payment state from its live
-- receipts. Caller holds the invoice row lock.
create or replace function public._invoice_refresh_payment(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv    public.vendor_invoices;
  v_paid numeric;
begin
  select * into inv from public.vendor_invoices where id = p_invoice_id;
  if inv.status in ('draft', 'void') or inv.payment_channel <> 'vendor_collected' then
    return;
  end if;

  select coalesce(sum(r.amount), 0) into v_paid
    from public.vendor_receipts r
   where r.invoice_id = p_invoice_id and r.status = 'issued';

  if v_paid > inv.total then
    -- Unreachable through record_receipt, which refuses overpayment; kept
    -- loud so a future path that skips that check cannot corrupt a balance.
    raise exception 'invoice_overpaid: receipts exceed the invoice total' using errcode = 'P0001';
  end if;

  update public.vendor_invoices
     set amount_paid = v_paid,
         status  = case when v_paid = 0 then 'issued'::public.invoice_status
                        when v_paid < inv.total then 'partially_paid'::public.invoice_status
                        else 'paid'::public.invoice_status end,
         paid_at = case when v_paid >= inv.total then coalesce(inv.paid_at, now()) end
   where id = p_invoice_id;
end;$$;

-- The escrow states in which the client's money is with Sinnapi (or has
-- already gone to the vendor). A booking invoice in any of these is paid.
create or replace function public._escrow_counts_as_paid(p_status public.escrow_status)
returns boolean language sql immutable set search_path = public as $$
  select p_status in ('funded', 'held', 'release_requested', 'admin_review',
                      'payout_approved', 'paid_out', 'disputed', 'partially_refunded');
$$;

-- Bring a booking invoice in line with its escrow. Full refund → back to
-- `issued` with nothing paid (confirmed 2026-11-05); partial refund keeps it paid.
create or replace function public._invoice_sync_escrow(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv      public.vendor_invoices;
  v_status public.escrow_status;
begin
  select * into inv from public.vendor_invoices where id = p_invoice_id for update;
  if inv.id is null or inv.payment_channel <> 'sinnapi_escrow'
     or inv.status in ('draft', 'void') or inv.deleted_at is not null then
    return;
  end if;

  select e.status into v_status
    from public.escrow_transactions e
   where e.booking_id = inv.booking_id
   order by e.created_at desc
   limit 1;

  if v_status is not null and public._escrow_counts_as_paid(v_status) then
    if inv.status <> 'paid' then
      update public.vendor_invoices
         set amount_paid = total, status = 'paid', paid_at = now()
       where id = p_invoice_id;
    end if;
  elsif v_status = 'refunded' and inv.status = 'paid' then
    update public.vendor_invoices
       set amount_paid = 0, status = 'issued', paid_at = null
     where id = p_invoice_id;
  end if;
end;$$;

-- The caller's vendor, or a permission error. Every vendor RPC starts here.
create or replace function public._require_vendor()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v_vendor uuid := public.current_vendor_id();
begin
  if v_vendor is null then
    raise exception 'forbidden: only a vendor can manage invoices and receipts' using errcode = '42501';
  end if;
  return v_vendor;
end;$$;

-- Lock and return one of the caller's invoices.
create or replace function public._lock_own_invoice(p_invoice_id uuid, p_vendor_id uuid)
returns public.vendor_invoices language plpgsql security definer set search_path = public as $$
declare
  inv public.vendor_invoices;
begin
  select * into inv from public.vendor_invoices
   where id = p_invoice_id and deleted_at is null
   for update;
  if inv.id is null or inv.vendor_id <> p_vendor_id then
    -- Not found and not yours read the same, so ids cannot be probed.
    raise exception 'not_found: invoice not found' using errcode = 'P0001';
  end if;
  return inv;
end;$$;

-- =====================================================================
-- INVOICES
-- =====================================================================

/**
 * Create (p_invoice_id null) or update a draft. Payload keys, all optional:
 *   client_id | contact_id | recipient_name, recipient_company,
 *   recipient_email, recipient_phone, recipient_address,
 *   title, issue_date, due_date, currency, show_vendor_tax_id,
 *   items: [{kind: item|charge, description, quantity, unit_price}],
 *   discount_type (percentage|fixed), discount_value,
 *   tax_label, tax_rate, tax_inclusive,
 *   payment_instructions, notes, terms, expected_version
 * A booking invoice accepts only title, dates, notes, terms,
 * recipient_address and show_vendor_tax_id; its lines and money are fixed.
 */
create or replace function public.save_invoice_draft(p_invoice_id uuid, p_draft jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_vendor    uuid := public._require_vendor();
  v_today     date := public._kampala_today();
  inv         public.vendor_invoices;
  v_id        uuid;
  v_client    uuid;
  v_contact   uuid;
  c           public.vendor_contacts;
  v_name      text;
  v_company   text;
  v_email     citext;
  v_phone     text;
  v_address   text;
  v_issue     date;
  v_due       date;
  v_currency  text;
  v_dtype     public.discount_type;
  v_dvalue    numeric;
  v_trate     numeric;
  v_tlabel    text;
  v_tincl     boolean;
  v_expected  integer := public._jnum(p_draft, 'expected_version')::integer;
  it          jsonb;
  v_kind      public.invoice_item_kind;
  v_qty       numeric;
  v_price     numeric;
  v_sort      integer := 0;
begin
  p_draft := coalesce(p_draft, '{}'::jsonb);

  if p_invoice_id is not null then
    inv := public._lock_own_invoice(p_invoice_id, v_vendor);
    if inv.status <> 'draft' then
      raise exception 'invoice_locked: an issued invoice cannot be edited — void it and issue a new one'
        using errcode = 'P0001';
    end if;
    if v_expected is not null and v_expected <> inv.version then
      raise exception 'optimistic_lock_conflict: this draft was changed elsewhere — reload it'
        using errcode = '40001';
    end if;
  end if;

  -- ---------- dates (every invoice) ----------
  v_issue := coalesce(public._jdate(p_draft, 'issue_date'), inv.issue_date, v_today);
  v_due   := coalesce(public._jdate(p_draft, 'due_date'), inv.due_date, v_issue + 7);
  if v_issue > v_today then
    raise exception 'issue_date_in_future: the issue date cannot be later than today' using errcode = 'P0001';
  end if;
  if v_due < v_issue then
    raise exception 'due_before_issue: the due date cannot be before the issue date' using errcode = 'P0001';
  end if;

  -- ---------- a booking invoice: only the wording moves ----------
  if inv.id is not null and inv.payment_channel = 'sinnapi_escrow' then
    update public.vendor_invoices
       set title              = public._jtext(p_draft, 'title'),
           issue_date         = v_issue,
           due_date           = v_due,
           notes              = public._jtext(p_draft, 'notes'),
           terms              = public._jtext(p_draft, 'terms'),
           recipient_address  = public._jtext(p_draft, 'recipient_address'),
           show_vendor_tax_id = coalesce((p_draft ->> 'show_vendor_tax_id')::boolean, inv.show_vendor_tax_id)
     where id = inv.id;
    return inv.id;
  end if;

  -- ---------- recipient ----------
  v_client  := nullif(p_draft ->> 'client_id', '')::uuid;
  v_contact := nullif(p_draft ->> 'contact_id', '')::uuid;
  v_name    := public._jtext(p_draft, 'recipient_name');
  v_company := public._jtext(p_draft, 'recipient_company');
  v_email   := lower(public._jtext(p_draft, 'recipient_email'))::citext;
  v_phone   := public._jtext(p_draft, 'recipient_phone');
  v_address := public._jtext(p_draft, 'recipient_address');

  if v_client is not null and v_contact is not null then
    raise exception 'recipient_ambiguous: choose a Sinnapi client or a saved client, not both' using errcode = 'P0001';
  end if;

  if v_client is not null then
    if not public._vendor_client_eligible(v_vendor, v_client) then
      raise exception 'client_not_eligible: you can only invoice Sinnapi clients you have a quote or booking with'
        using errcode = 'P0001';
    end if;
    select r.full_name, r.phone into v_name, v_phone from public._registered_recipient(v_client) r;
    v_email := null;      -- never stored for a registered client
    v_company := null;
  elsif v_contact is not null then
    select * into c from public.vendor_contacts
     where id = v_contact and vendor_id = v_vendor and deleted_at is null;
    if c.id is null then
      raise exception 'not_found: saved client not found' using errcode = 'P0001';
    end if;
    -- The contact pre-fills; anything typed for this document wins.
    v_name    := coalesce(v_name, c.full_name);
    v_company := coalesce(v_company, c.company_name);
    v_email   := coalesce(v_email, c.email);
    v_phone   := coalesce(v_phone, c.phone);
    v_address := coalesce(v_address, c.address);
  end if;

  -- ---------- currency, discount, tax ----------
  v_currency := upper(coalesce(public._jtext(p_draft, 'currency'), inv.currency, 'UGX'));
  if not exists (select 1 from public.currencies where code = v_currency and is_active) then
    raise exception 'currency_unsupported: % is not an available currency', v_currency using errcode = 'P0001';
  end if;

  v_dtype  := nullif(p_draft ->> 'discount_type', '')::public.discount_type;
  v_dvalue := public._jnum(p_draft, 'discount_value');
  if v_dtype is null or v_dvalue is null or v_dvalue = 0 then
    v_dtype := null; v_dvalue := null;
  elsif v_dvalue < 0 or (v_dtype = 'percentage' and v_dvalue > 100) then
    raise exception 'discount_out_of_range: a discount must be between 0 and 100%%, or a positive amount'
      using errcode = 'P0001';
  end if;

  v_trate  := public._jnum(p_draft, 'tax_rate');
  if v_trate is not null and (v_trate <= 0 or v_trate > 100) then
    raise exception 'tax_rate_out_of_range: a tax rate must be above 0 and at most 100%%' using errcode = 'P0001';
  end if;
  v_tlabel := case when v_trate is not null then coalesce(public._jtext(p_draft, 'tax_label'), 'Tax') end;
  v_tincl  := case when v_trate is not null then coalesce((p_draft ->> 'tax_inclusive')::boolean, false) else false end;

  -- ---------- the row ----------
  if inv.id is null then
    insert into public.vendor_invoices (vendor_id, status, payment_channel, currency, issue_date, due_date)
    values (v_vendor, 'draft', 'vendor_collected', v_currency, v_issue, v_due)
    returning id into v_id;
  else
    v_id := inv.id;
  end if;

  update public.vendor_invoices
     set client_id            = v_client,
         contact_id           = v_contact,
         recipient_name       = v_name,
         recipient_company    = v_company,
         recipient_email      = v_email,
         recipient_phone      = v_phone,
         recipient_address    = v_address,
         title                = public._jtext(p_draft, 'title'),
         issue_date           = v_issue,
         due_date             = v_due,
         currency             = v_currency,
         show_vendor_tax_id   = coalesce((p_draft ->> 'show_vendor_tax_id')::boolean, false),
         discount_type        = v_dtype,
         discount_value       = v_dvalue,
         tax_rate             = v_trate,
         tax_label            = v_tlabel,
         tax_inclusive        = v_tincl,
         payment_instructions = public._jtext(p_draft, 'payment_instructions'),
         notes                = public._jtext(p_draft, 'notes'),
         terms                = public._jtext(p_draft, 'terms')
   where id = v_id;

  -- ---------- lines: replaced wholesale ----------
  if jsonb_typeof(coalesce(p_draft -> 'items', '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_items: items must be a list' using errcode = 'P0001';
  end if;
  if jsonb_array_length(coalesce(p_draft -> 'items', '[]'::jsonb)) > 200 then
    raise exception 'too_many_items: an invoice can have at most 200 lines' using errcode = 'P0001';
  end if;

  delete from public.vendor_invoice_items where invoice_id = v_id;
  for it in select * from jsonb_array_elements(coalesce(p_draft -> 'items', '[]'::jsonb)) loop
    v_kind  := coalesce(nullif(it ->> 'kind', ''), 'item')::public.invoice_item_kind;
    v_qty   := coalesce(public._jnum(it, 'quantity'), 1);
    v_price := coalesce(public._jnum(it, 'unit_price'), 0);
    if coalesce(public._jtext(it, 'description'), '') = '' then
      raise exception 'item_description_required: every line needs a description' using errcode = 'P0001';
    end if;
    if v_qty <= 0 then
      raise exception 'item_quantity_invalid: quantities must be more than zero' using errcode = 'P0001';
    end if;
    -- quantity is numeric(12,2); a line total must fit numeric(14,2).
    if v_qty >= 10000000000 or round(v_qty, 2) * v_price >= 1000000000000 then
      raise exception 'number_too_large: a line is too large' using errcode = 'P0001';
    end if;
    if v_price < 0 then
      raise exception 'item_price_invalid: prices cannot be negative' using errcode = 'P0001';
    end if;
    insert into public.vendor_invoice_items (invoice_id, kind, description, quantity, unit_price, line_total, sort_order)
    values (v_id, v_kind, public._jtext(it, 'description'), round(v_qty, 2),
            public._money_round(v_price, v_currency),
            public._money_round(round(v_qty, 2) * public._money_round(v_price, v_currency), v_currency),
            v_sort);
    v_sort := v_sort + 1;
  end loop;

  perform public._invoice_recompute(v_id);
  return v_id;
end;$$;

/**
 * Start a Sinnapi-paid invoice for one of the vendor's bookings, pre-filled
 * from its quotation. Idempotent: a booking that already has a live invoice
 * returns that invoice's id.
 */
create or replace function public.create_invoice_from_booking(p_booking_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_vendor   uuid := public._require_vendor();
  v_today    date := public._kampala_today();
  b          public.bookings;
  q          public.quotations;
  v_id       uuid;
  v_name     text;
  v_phone    text;
  v_discount numeric;
  v_expected numeric;
  v_due      date;
begin
  select * into b from public.bookings where id = p_booking_id and deleted_at is null;
  if b.id is null or b.vendor_id <> v_vendor then
    raise exception 'not_found: booking not found' using errcode = 'P0001';
  end if;
  if b.status not in ('confirmed', 'in_progress', 'completed') then
    raise exception 'booking_not_invoiceable: a booking can be invoiced once it is confirmed' using errcode = 'P0001';
  end if;
  if b.amount <= 0 then
    raise exception 'booking_unpriced: this booking has no agreed amount yet' using errcode = 'P0001';
  end if;

  select i.id into v_id from public.vendor_invoices i
   where i.booking_id = b.id and i.status <> 'void' and i.deleted_at is null;
  if v_id is not null then
    return v_id;
  end if;

  select r.full_name, r.phone into v_name, v_phone from public._registered_recipient(b.client_id) r;

  v_due := least(b.event_date, v_today + 7);
  if v_due < v_today then v_due := v_today; end if;

  insert into public.vendor_invoices (
    vendor_id, status, payment_channel, client_id, booking_id, quotation_id,
    recipient_name, recipient_phone, title, currency, issue_date, due_date)
  values (
    v_vendor, 'draft', 'sinnapi_escrow', b.client_id, b.id, b.quotation_id,
    v_name, v_phone,
    'Booking ' || b.reference_no || ' — ' || to_char(b.event_date, 'FMDD Mon YYYY'),
    b.currency, v_today, v_due)
  returning id into v_id;

  if b.quotation_id is not null then
    select * into q from public.quotations where id = b.quotation_id;
  end if;

  if q.id is not null and exists (select 1 from public.quotation_items where quotation_id = q.id) then
    insert into public.vendor_invoice_items (invoice_id, kind, description, quantity, unit_price, line_total, sort_order)
    select v_id, 'item', qi.description, qi.quantity, qi.unit_price, qi.line_total, qi.sort_order
      from public.quotation_items qi
     where qi.quotation_id = q.id
     order by qi.sort_order, qi.id;

    v_discount := coalesce(q.discount_total, 0) + coalesce(q.offer_discount_total, 0);
    v_expected := q.subtotal - v_discount + case when q.tax_inclusive then 0 else q.tax_total end;

    -- The invoice must state exactly what escrow will charge. A quote whose
    -- figures do not add up to the booking amount is refused, not "fixed".
    if v_expected <> b.amount then
      raise exception 'booking_amount_mismatch: the quotation total does not match the booking amount — contact support'
        using errcode = 'P0001';
    end if;

    update public.vendor_invoices
       set subtotal       = q.subtotal,
           discount_type  = case when v_discount > 0 then 'fixed'::public.discount_type end,
           discount_value = case when v_discount > 0 then v_discount end,
           discount_total = v_discount,
           tax_rate       = case when q.tax_total > 0 then q.tax_rate end,
           tax_label      = case when q.tax_total > 0 then 'Tax' end,
           tax_inclusive  = case when q.tax_total > 0 then q.tax_inclusive else false end,
           tax_total      = coalesce(q.tax_total, 0),
           total          = b.amount
     where id = v_id;
  else
    insert into public.vendor_invoice_items (invoice_id, kind, description, quantity, unit_price, line_total, sort_order)
    values (v_id, 'item', 'Booking ' || b.reference_no, 1, b.amount, b.amount, 0);
    update public.vendor_invoices set subtotal = b.amount, total = b.amount where id = v_id;
  end if;

  return v_id;
end;$$;

/**
 * Issue a draft: number it, freeze the vendor and recipient details, save an
 * external recipient as a contact, notify a registered client in-app.
 * Returns {id, document_no, status}.
 */
create or replace function public.issue_invoice(p_invoice_id uuid, p_expected_version integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_vendor     uuid := public._require_vendor();
  v_today      date := public._kampala_today();
  inv          public.vendor_invoices;
  v_contact    uuid;
  v_name       text;
  v_phone      text;
  v_no         text;
  v_constraint text;
  v_attempt    integer;
begin
  inv := public._lock_own_invoice(p_invoice_id, v_vendor);

  if inv.status <> 'draft' then
    raise exception 'invalid_state: this invoice has already been issued' using errcode = 'P0001';
  end if;
  if p_expected_version is not null and p_expected_version <> inv.version then
    raise exception 'optimistic_lock_conflict: this draft was changed elsewhere — reload it' using errcode = '40001';
  end if;
  if not exists (select 1 from public.vendor_invoice_items where invoice_id = inv.id and kind = 'item') then
    raise exception 'items_required: add at least one item before issuing' using errcode = 'P0001';
  end if;
  if inv.total <= 0 then
    raise exception 'invoice_total_zero: an invoice must be for more than zero' using errcode = 'P0001';
  end if;
  if inv.issue_date > v_today then
    raise exception 'issue_date_in_future: the issue date cannot be later than today' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.currencies where code = inv.currency and is_active) then
    raise exception 'currency_unsupported: % is not an available currency', inv.currency using errcode = 'P0001';
  end if;

  -- ---------- the recipient, as of now ----------
  if inv.client_id is not null then
    if not public._vendor_client_eligible(v_vendor, inv.client_id) then
      raise exception 'client_not_eligible: you can only invoice Sinnapi clients you have a quote or booking with'
        using errcode = 'P0001';
    end if;
    select r.full_name, r.phone into v_name, v_phone from public._registered_recipient(inv.client_id) r;
    v_contact := null;
  else
    v_name  := inv.recipient_name;
    v_phone := inv.recipient_phone;
    if coalesce(btrim(v_name), '') = '' then
      raise exception 'recipient_required: add who this invoice is for' using errcode = 'P0001';
    end if;
    v_contact := coalesce(inv.contact_id,
      public._match_or_save_contact(v_vendor, v_name, inv.recipient_company, inv.recipient_email,
                                    v_phone, inv.recipient_address));
  end if;

  -- ---------- number it, retrying the (rare) clash ----------
  for v_attempt in 1 .. 20 loop
    begin
      v_no := public._gen_document_no('SNP-INV');
      update public.vendor_invoices
         set status          = 'issued',
             document_no     = v_no,
             contact_id      = v_contact,
             recipient_name  = v_name,
             recipient_phone = v_phone,
             vendor_snapshot = public._vendor_snapshot(v_vendor, inv.show_vendor_tax_id, inv.client_id is null),
             issued_at       = now(),
             issued_by       = auth.uid()
       where id = inv.id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_vendor_invoices_document_no' or v_attempt = 20 then
        raise;
      end if;
    end;
  end loop;

  -- A booking whose escrow is already funded is paid the moment it is invoiced.
  if inv.payment_channel = 'sinnapi_escrow' then
    perform public._invoice_sync_escrow(inv.id);
  end if;

  if inv.client_id is not null then
    perform public.notify_party(
      'payment.invoice_issued', inv.client_id, 'client', 'vendor_invoice', inv.id,
      jsonb_build_object('vendor_id', v_vendor, 'invoice_id', inv.id, 'document_no', v_no,
                         'currency', inv.currency, 'total', inv.total,
                         'due_date', to_char(inv.due_date, 'FMDD Mon YYYY')));
  end if;

  select * into inv from public.vendor_invoices where id = inv.id;
  return jsonb_build_object('id', inv.id, 'document_no', inv.document_no, 'status', inv.status);
end;$$;

/** Void an issued invoice. Refused while it has live receipts, or once Sinnapi has collected it. */
create or replace function public.void_invoice(p_invoice_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_vendor uuid := public._require_vendor();
  inv      public.vendor_invoices;
begin
  inv := public._lock_own_invoice(p_invoice_id, v_vendor);

  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason_required: say why this invoice is being voided' using errcode = 'P0001';
  end if;
  if inv.status = 'draft' then
    raise exception 'invalid_state: a draft is deleted, not voided' using errcode = 'P0001';
  end if;
  if inv.status = 'void' then
    raise exception 'invalid_state: this invoice is already void' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.vendor_receipts r where r.invoice_id = inv.id and r.status = 'issued') then
    raise exception 'invoice_has_receipts: void its receipts first' using errcode = 'P0001';
  end if;
  if inv.payment_channel = 'sinnapi_escrow' and inv.status = 'paid' then
    raise exception 'invoice_paid_through_sinnapi: this booking has been paid through Sinnapi and its invoice stays'
      using errcode = 'P0001';
  end if;

  update public.vendor_invoices
     set status = 'void', voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = inv.id;
end;$$;

/** Copy any of the vendor's own invoices into a new draft. Booking invoices cannot be copied. */
create or replace function public.duplicate_invoice(p_invoice_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_vendor uuid := public._require_vendor();
  v_today  date := public._kampala_today();
  inv      public.vendor_invoices;
  v_id     uuid;
begin
  select * into inv from public.vendor_invoices
   where id = p_invoice_id and vendor_id = v_vendor and deleted_at is null;
  if inv.id is null then
    raise exception 'not_found: invoice not found' using errcode = 'P0001';
  end if;
  if inv.payment_channel = 'sinnapi_escrow' then
    raise exception 'cannot_duplicate_booking_invoice: a booking has one invoice — create a new invoice instead'
      using errcode = 'P0001';
  end if;
  if inv.client_id is not null and not public._vendor_client_eligible(v_vendor, inv.client_id) then
    inv.client_id := null;
  end if;

  insert into public.vendor_invoices (
    vendor_id, status, payment_channel, client_id, contact_id,
    recipient_name, recipient_company, recipient_email, recipient_phone, recipient_address,
    title, show_vendor_tax_id, issue_date, due_date, payment_instructions, notes, terms,
    currency, discount_type, discount_value, tax_label, tax_rate, tax_inclusive)
  values (
    v_vendor, 'draft', 'vendor_collected', inv.client_id, inv.contact_id,
    inv.recipient_name, inv.recipient_company, inv.recipient_email, inv.recipient_phone, inv.recipient_address,
    inv.title, inv.show_vendor_tax_id, v_today, v_today + greatest(inv.due_date - inv.issue_date, 0),
    inv.payment_instructions, inv.notes, inv.terms,
    inv.currency, inv.discount_type, inv.discount_value, inv.tax_label, inv.tax_rate, inv.tax_inclusive)
  returning id into v_id;

  insert into public.vendor_invoice_items (invoice_id, kind, description, quantity, unit_price, line_total, sort_order)
  select v_id, kind, description, quantity, unit_price, line_total, sort_order
    from public.vendor_invoice_items where invoice_id = inv.id;

  perform public._invoice_recompute(v_id);
  return v_id;
end;$$;

/** Delete a draft (soft). Issued invoices are voided instead. */
create or replace function public.delete_invoice_draft(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_vendor uuid := public._require_vendor();
  inv      public.vendor_invoices;
begin
  inv := public._lock_own_invoice(p_invoice_id, v_vendor);
  if inv.status <> 'draft' then
    raise exception 'invalid_state: only a draft can be deleted — void an issued invoice instead' using errcode = 'P0001';
  end if;
  delete from public.vendor_invoices where id = inv.id;   -- routed to a soft delete by tg_soft_delete
end;$$;

-- =====================================================================
-- RECEIPTS
-- =====================================================================

/**
 * Record a payment the vendor received. Payload:
 *   idempotency_key (uuid, required), confirmed (must be true),
 *   amount, payment_date, payment_method, payment_reference, description, notes,
 *   invoice_id            — linked: recipient, currency and balance come from it
 *   or, standalone:       client_id | contact_id | recipient_* , currency,
 *                         outstanding_balance (optional)
 * Returns {id, document_no, invoice_status}. A repeated idempotency key
 * returns the receipt it already created.
 */
create or replace function public.record_receipt(p_receipt jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_vendor     uuid := public._require_vendor();
  v_today      date := public._kampala_today();
  v_key        uuid;
  r            public.vendor_receipts;
  inv          public.vendor_invoices;
  c            public.vendor_contacts;
  v_amount     numeric;
  v_date       date;
  v_method     public.receipt_payment_method;
  v_currency   text;
  v_desc       text;
  v_client     uuid;
  v_contact    uuid;
  v_name       text;
  v_company    text;
  v_email      citext;
  v_phone      text;
  v_address    text;
  v_before     numeric;
  v_after      numeric;
  v_show_tin   boolean;
  v_no         text;
  v_id         uuid;
  v_constraint text;
  v_attempt    integer;
  v_inv_status public.invoice_status;
begin
  p_receipt := coalesce(p_receipt, '{}'::jsonb);

  begin
    v_key := (p_receipt ->> 'idempotency_key')::uuid;
  exception when invalid_text_representation then
    v_key := null;
  end;
  if v_key is null then
    raise exception 'idempotency_key_required: missing request key' using errcode = 'P0001';
  end if;

  select * into r from public.vendor_receipts where vendor_id = v_vendor and idempotency_key = v_key;
  if r.id is not null then
    select i.status into v_inv_status from public.vendor_invoices i where i.id = r.invoice_id;
    return jsonb_build_object('id', r.id, 'document_no', r.document_no, 'invoice_status', v_inv_status);
  end if;

  if coalesce((p_receipt ->> 'confirmed')::boolean, false) is not true then
    raise exception 'confirmation_required: confirm that you have received this payment' using errcode = 'P0001';
  end if;

  v_amount := public._jnum(p_receipt, 'amount');
  v_date   := coalesce(public._jdate(p_receipt, 'payment_date'), v_today);
  begin
    v_method := (p_receipt ->> 'payment_method')::public.receipt_payment_method;
  exception when invalid_text_representation then
    v_method := null;
  end;
  if v_method is null then
    raise exception 'payment_method_required: choose how you were paid' using errcode = 'P0001';
  end if;
  if v_date > v_today then
    raise exception 'payment_date_in_future: the payment date cannot be later than today' using errcode = 'P0001';
  end if;

  -- ---------- linked to an invoice ----------
  if nullif(p_receipt ->> 'invoice_id', '') is not null then
    inv := public._lock_own_invoice((p_receipt ->> 'invoice_id')::uuid, v_vendor);

    if inv.payment_channel = 'sinnapi_escrow' then
      raise exception 'receipt_blocked_escrow: this booking is paid through Sinnapi — Sinnapi''s payment confirmation is the receipt'
        using errcode = 'P0001';
    end if;
    if inv.status not in ('issued', 'partially_paid') then
      raise exception 'invoice_not_payable: payments can only be recorded against an unpaid issued invoice'
        using errcode = 'P0001';
    end if;
    if v_date < inv.issue_date then
      raise exception 'payment_before_issue: the payment date cannot be before the invoice date' using errcode = 'P0001';
    end if;

    v_currency := inv.currency;
    v_amount   := public._money_round(v_amount, v_currency);
    if v_amount is null or v_amount <= 0 then
      raise exception 'amount_invalid: the amount received must be more than zero' using errcode = 'P0001';
    end if;
    if v_amount > inv.balance_due then
      raise exception 'amount_exceeds_balance: this is more than the % % still owed', v_currency, inv.balance_due
        using errcode = 'P0001';
    end if;

    v_client  := inv.client_id;
    v_contact := inv.contact_id;
    v_name    := inv.recipient_name;
    v_company := inv.recipient_company;
    v_email   := inv.recipient_email;
    v_phone   := inv.recipient_phone;
    v_address := inv.recipient_address;
    v_show_tin := inv.show_vendor_tax_id;
    v_before  := inv.balance_due;
    v_after   := inv.balance_due - v_amount;
    v_desc    := coalesce(public._jtext(p_receipt, 'description'), 'Payment for ' || inv.document_no);

  -- ---------- standalone ----------
  else
    v_currency := upper(coalesce(public._jtext(p_receipt, 'currency'), 'UGX'));
    if not exists (select 1 from public.currencies where code = v_currency and is_active) then
      raise exception 'currency_unsupported: % is not an available currency', v_currency using errcode = 'P0001';
    end if;
    v_amount := public._money_round(v_amount, v_currency);
    if v_amount is null or v_amount <= 0 then
      raise exception 'amount_invalid: the amount received must be more than zero' using errcode = 'P0001';
    end if;

    v_client  := nullif(p_receipt ->> 'client_id', '')::uuid;
    v_contact := nullif(p_receipt ->> 'contact_id', '')::uuid;
    v_name    := public._jtext(p_receipt, 'recipient_name');
    v_company := public._jtext(p_receipt, 'recipient_company');
    v_email   := lower(public._jtext(p_receipt, 'recipient_email'))::citext;
    v_phone   := public._jtext(p_receipt, 'recipient_phone');
    v_address := public._jtext(p_receipt, 'recipient_address');

    if v_client is not null and v_contact is not null then
      raise exception 'recipient_ambiguous: choose a Sinnapi client or a saved client, not both' using errcode = 'P0001';
    end if;

    if v_client is not null then
      if not public._vendor_client_eligible(v_vendor, v_client) then
        raise exception 'client_not_eligible: you can only issue receipts to Sinnapi clients you have a quote or booking with'
          using errcode = 'P0001';
      end if;
      select x.full_name, x.phone into v_name, v_phone from public._registered_recipient(v_client) x;
      v_email := null; v_company := null;
    else
      if v_contact is not null then
        select * into c from public.vendor_contacts
         where id = v_contact and vendor_id = v_vendor and deleted_at is null;
        if c.id is null then
          raise exception 'not_found: saved client not found' using errcode = 'P0001';
        end if;
        v_name    := coalesce(v_name, c.full_name);
        v_company := coalesce(v_company, c.company_name);
        v_email   := coalesce(v_email, c.email);
        v_phone   := coalesce(v_phone, c.phone);
        v_address := coalesce(v_address, c.address);
      end if;
      if coalesce(btrim(v_name), '') = '' then
        raise exception 'recipient_required: add who paid you' using errcode = 'P0001';
      end if;
      v_contact := coalesce(v_contact,
        public._match_or_save_contact(v_vendor, v_name, v_company, v_email, v_phone, v_address));
    end if;

    v_desc := public._jtext(p_receipt, 'description');
    if v_desc is null then
      raise exception 'description_required: say what this payment was for' using errcode = 'P0001';
    end if;
    v_show_tin := coalesce((p_receipt ->> 'show_vendor_tax_id')::boolean, false);
    v_before := null;
    v_after  := public._money_round(public._jnum(p_receipt, 'outstanding_balance'), v_currency);
    if v_after is not null and v_after < 0 then
      raise exception 'balance_invalid: the outstanding balance cannot be negative' using errcode = 'P0001';
    end if;
  end if;

  -- ---------- number and insert ----------
  for v_attempt in 1 .. 20 loop
    begin
      v_no := public._gen_document_no('SNP-RCT');
      insert into public.vendor_receipts (
        vendor_id, document_no, status, invoice_id,
        client_id, contact_id, recipient_name, recipient_company, recipient_email, recipient_phone, recipient_address,
        vendor_snapshot, show_vendor_tax_id,
        currency, amount, payment_date, payment_method, payment_reference, description, notes,
        balance_before, balance_after, vendor_confirmed_at, idempotency_key, issued_by)
      values (
        v_vendor, v_no, 'issued', inv.id,
        v_client, v_contact, v_name, v_company, v_email, v_phone, v_address,
        public._vendor_snapshot(v_vendor, v_show_tin, v_client is null), v_show_tin,
        v_currency, v_amount, v_date, v_method, public._jtext(p_receipt, 'payment_reference'),
        v_desc, public._jtext(p_receipt, 'notes'),
        v_before, v_after, now(), v_key, auth.uid())
      returning id into v_id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'ux_vendor_receipts_idempotency' then
        -- The same request, landing twice at once: hand back the first.
        select * into r from public.vendor_receipts where vendor_id = v_vendor and idempotency_key = v_key;
        return jsonb_build_object('id', r.id, 'document_no', r.document_no);
      end if;
      if v_constraint is distinct from 'ux_vendor_receipts_document_no' or v_attempt = 20 then
        raise;
      end if;
    end;
  end loop;

  if inv.id is not null then
    perform public._invoice_refresh_payment(inv.id);
    select i.status into v_inv_status from public.vendor_invoices i where i.id = inv.id;
  end if;

  if v_client is not null then
    perform public.notify_party(
      'payment.receipt_issued', v_client, 'client', 'vendor_receipt', v_id,
      jsonb_build_object('vendor_id', v_vendor, 'receipt_id', v_id, 'document_no', v_no,
                         'currency', v_currency, 'amount', v_amount));
  end if;

  return jsonb_build_object('id', v_id, 'document_no', v_no, 'invoice_status', v_inv_status);
end;$$;

/** Void a receipt; its invoice's balance is restored. */
create or replace function public.void_receipt(p_receipt_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_vendor  uuid := public._require_vendor();
  v_invoice uuid;
  r         public.vendor_receipts;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason_required: say why this receipt is being voided' using errcode = 'P0001';
  end if;

  -- Lock order is always invoice, then receipt — the same order
  -- record_receipt takes — so the two can never deadlock.
  select x.invoice_id into v_invoice from public.vendor_receipts x
   where x.id = p_receipt_id and x.vendor_id = v_vendor;
  if v_invoice is not null then
    perform 1 from public.vendor_invoices where id = v_invoice for update;
  end if;

  select * into r from public.vendor_receipts where id = p_receipt_id for update;
  if r.id is null or r.vendor_id <> v_vendor then
    raise exception 'not_found: receipt not found' using errcode = 'P0001';
  end if;
  if r.status = 'void' then
    raise exception 'invalid_state: this receipt is already void' using errcode = 'P0001';
  end if;

  update public.vendor_receipts
     set status = 'void', voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
   where id = r.id;

  if r.invoice_id is not null then
    perform public._invoice_refresh_payment(r.invoice_id);
  end if;
end;$$;

-- =====================================================================
-- THE LIST PAGE'S HEADLINE FIGURES
-- =====================================================================
create or replace function public.vendor_document_summary()
returns table (currency text, outstanding numeric, open_count integer,
               overdue_amount numeric, overdue_count integer)
language sql stable security definer set search_path = public as $$
  select i.currency,
         sum(i.balance_due),
         count(*)::integer,
         coalesce(sum(i.balance_due) filter (where i.due_date < public._kampala_today()), 0),
         (count(*) filter (where i.due_date < public._kampala_today()))::integer
    from public.vendor_invoices i
   where i.vendor_id = public._require_vendor()
     and i.status in ('issued', 'partially_paid')
     and i.deleted_at is null
   group by i.currency
   order by i.currency;
$$;

-- =====================================================================
-- EMAIL DELIVERY (service role only: the send-financial-document function)
-- =====================================================================

/**
 * Claim a send. Checks the document is the vendor's and sendable, enforces
 * the rolling 24-hour cap under a per-vendor lock, and writes the
 * `sending` row. A repeated request_key returns the existing row with
 * `duplicate = true` so the function can answer without sending again.
 */
create or replace function public.begin_document_delivery(
  p_vendor_id        uuid,
  p_kind             text,
  p_document_id      uuid,
  p_recipient_kind   public.document_recipient_kind,
  p_recipient_display text,
  p_cc_self          boolean,
  p_subject          text,
  p_message          text,
  p_attachment_path  text,
  p_attachment_sha256 text,
  p_request_key      uuid,
  p_requested_by     uuid)
returns table (delivery_id uuid, duplicate boolean, delivery_status public.document_delivery_status)
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.vendor_document_deliveries;
  v_status   text;
  v_limit    integer;
  v_used     integer;
  v_id       uuid;
begin
  select * into v_existing from public.vendor_document_deliveries d
   where d.vendor_id = p_vendor_id and d.request_key = p_request_key;
  if v_existing.id is not null then
    return query select v_existing.id, true, v_existing.status;
    return;
  end if;

  if p_kind = 'invoice' then
    select i.status::text into v_status from public.vendor_invoices i
     where i.id = p_document_id and i.vendor_id = p_vendor_id and i.deleted_at is null;
  elsif p_kind = 'receipt' then
    select r.status::text into v_status from public.vendor_receipts r
     where r.id = p_document_id and r.vendor_id = p_vendor_id;
  else
    raise exception 'invalid_kind: % is not invoice or receipt', p_kind using errcode = 'P0001';
  end if;

  if v_status is null then
    raise exception 'not_found: document not found' using errcode = 'P0001';
  end if;
  if v_status in ('draft', 'void') then
    raise exception 'document_not_sendable: only an issued document can be emailed' using errcode = 'P0001';
  end if;
  if p_attachment_path is distinct from
     (p_vendor_id::text || '/' || p_kind || '/' || p_document_id::text || '.pdf') then
    raise exception 'attachment_path_invalid: the attachment does not belong to this document' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vendor_document_delivery:' || p_vendor_id::text, 0));

  v_limit := coalesce((public.get_setting('document_email_daily_limit') #>> '{}')::integer, 50);
  select count(*) into v_used from public.vendor_document_deliveries d
   where d.vendor_id = p_vendor_id and d.created_at > now() - interval '24 hours';
  if v_used >= v_limit then
    raise exception 'daily_email_limit_reached: you have sent % documents in the last 24 hours — try again later', v_limit
      using errcode = 'P0001';
  end if;

  insert into public.vendor_document_deliveries (
    vendor_id, invoice_id, receipt_id, recipient_kind, recipient_display, cc_self,
    subject, message, status, attachment_path, attachment_sha256, request_key, requested_by)
  values (
    p_vendor_id,
    case when p_kind = 'invoice' then p_document_id end,
    case when p_kind = 'receipt' then p_document_id end,
    p_recipient_kind, p_recipient_display, coalesce(p_cc_self, false),
    p_subject, nullif(btrim(p_message), ''), 'sending', p_attachment_path, lower(p_attachment_sha256),
    p_request_key, p_requested_by)
  returning id into v_id;

  return query select v_id, false, 'sending'::public.document_delivery_status;
end;$$;

create or replace function public.finish_document_delivery(
  p_delivery_id uuid, p_sent boolean, p_error text default null, p_provider_message_id text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.vendor_document_deliveries
     set status              = case when p_sent then 'sent' else 'failed' end::public.document_delivery_status,
         sent_at             = case when p_sent then now() end,
         finished_at         = now(),
         error               = case when p_sent then null else left(coalesce(p_error, 'Unknown error'), 1000) end,
         provider_message_id = p_provider_message_id
   where id = p_delivery_id and status = 'sending';
end;$$;

-- =====================================================================
-- GRANTS
-- Functions are executable by PUBLIC by default; take that away from all
-- of these first, then hand back exactly what each role needs.
-- =====================================================================
do $$
declare
  f text;
begin
  foreach f in array array[
    'public._kampala_today()',
    'public._money_round(numeric, text)',
    'public._jnum(jsonb, text)',
    'public._jdate(jsonb, text)',
    'public._jtext(jsonb, text)',
    'public._gen_document_no(text)',
    'public._vendor_client_eligible(uuid, uuid)',
    'public._vendor_snapshot(uuid, boolean, boolean)',
    'public._registered_recipient(uuid)',
    'public._match_or_save_contact(uuid, text, text, citext, text, text)',
    'public._invoice_recompute(uuid)',
    'public._invoice_refresh_payment(uuid)',
    'public._escrow_counts_as_paid(public.escrow_status)',
    'public._invoice_sync_escrow(uuid)',
    'public._require_vendor()',
    'public._lock_own_invoice(uuid, uuid)',
    'public.save_invoice_draft(uuid, jsonb)',
    'public.create_invoice_from_booking(uuid)',
    'public.issue_invoice(uuid, integer)',
    'public.void_invoice(uuid, text)',
    'public.duplicate_invoice(uuid)',
    'public.delete_invoice_draft(uuid)',
    'public.record_receipt(jsonb)',
    'public.void_receipt(uuid, text)',
    'public.vendor_document_summary()',
    'public.begin_document_delivery(uuid, text, uuid, public.document_recipient_kind, text, boolean, text, text, text, text, uuid, uuid)',
    'public.finish_document_delivery(uuid, boolean, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;

grant execute on function public.save_invoice_draft(uuid, jsonb)          to authenticated;
grant execute on function public.create_invoice_from_booking(uuid)        to authenticated;
grant execute on function public.issue_invoice(uuid, integer)             to authenticated;
grant execute on function public.void_invoice(uuid, text)                 to authenticated;
grant execute on function public.duplicate_invoice(uuid)                  to authenticated;
grant execute on function public.delete_invoice_draft(uuid)               to authenticated;
grant execute on function public.record_receipt(jsonb)                    to authenticated;
grant execute on function public.void_receipt(uuid, text)                 to authenticated;
grant execute on function public.vendor_document_summary()                to authenticated;

grant execute on function public.begin_document_delivery(uuid, text, uuid, public.document_recipient_kind, text, boolean, text, text, text, text, uuid, uuid) to service_role;
grant execute on function public.finish_document_delivery(uuid, boolean, text, text) to service_role;
