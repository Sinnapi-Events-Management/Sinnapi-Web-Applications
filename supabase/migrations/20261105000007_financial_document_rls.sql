-- =====================================================================
-- Sinnapi — 1105g Vendor invoices & receipts: who can see what
--
--                       vendor owner   registered client        staff (payments.read)
--   vendor_contacts     read + write   —                        —
--   vendor_invoices     read           read, once not a draft   read
--   vendor_invoice_items read          read, with its invoice   read
--   vendor_receipts     read           read                     read
--   deliveries          read           —                        read
--
-- No client role can INSERT, UPDATE or DELETE an invoice, line, receipt or
-- delivery directly — not even the vendor. Those writes exist only inside
-- the 1105f functions, which recompute and lock what a raw PATCH would
-- skip. Contacts are plain vendor-owned data with no financial effect, so
-- the vendor edits them directly under RLS.
--
-- Every table forces RLS, like the rest of `public` (0011).
-- =====================================================================

alter table public.vendor_contacts            enable row level security;
alter table public.vendor_contacts            force  row level security;
alter table public.vendor_invoices            enable row level security;
alter table public.vendor_invoices            force  row level security;
alter table public.vendor_invoice_items       enable row level security;
alter table public.vendor_invoice_items       force  row level security;
alter table public.vendor_receipts            enable row level security;
alter table public.vendor_receipts            force  row level security;
alter table public.vendor_document_deliveries enable row level security;
alter table public.vendor_document_deliveries force  row level security;

-- Table privileges first, as a second wall behind the policies.
revoke all on table public.vendor_contacts, public.vendor_invoices, public.vendor_invoice_items,
                    public.vendor_receipts, public.vendor_document_deliveries from anon;
revoke insert, update, delete, truncate on table public.vendor_invoices, public.vendor_invoice_items,
                    public.vendor_receipts, public.vendor_document_deliveries from authenticated;
grant select on table public.vendor_invoices, public.vendor_invoice_items,
                      public.vendor_receipts, public.vendor_document_deliveries to authenticated;
grant select, insert, update, delete on table public.vendor_contacts to authenticated;

-- ---------- contacts ----------
drop policy if exists vendor_contacts_read on public.vendor_contacts;
create policy vendor_contacts_read on public.vendor_contacts for select to authenticated
  using (public.is_vendor_owner(vendor_id));

drop policy if exists vendor_contacts_insert on public.vendor_contacts;
create policy vendor_contacts_insert on public.vendor_contacts for insert to authenticated
  with check (public.is_vendor_owner(vendor_id));

drop policy if exists vendor_contacts_update on public.vendor_contacts;
create policy vendor_contacts_update on public.vendor_contacts for update to authenticated
  using (public.is_vendor_owner(vendor_id))
  with check (public.is_vendor_owner(vendor_id));

-- DELETE is routed to a soft delete by tg_soft_delete.
drop policy if exists vendor_contacts_delete on public.vendor_contacts;
create policy vendor_contacts_delete on public.vendor_contacts for delete to authenticated
  using (public.is_vendor_owner(vendor_id));

-- ---------- invoices ----------
drop policy if exists vendor_invoices_read on public.vendor_invoices;
create policy vendor_invoices_read on public.vendor_invoices for select to authenticated
  using (public.is_vendor_owner(vendor_id)
         or (client_id = auth.uid() and status <> 'draft' and deleted_at is null)
         or public.has_permission('payments.read'));

-- A line is visible exactly when its invoice is; the subquery runs under
-- the invoice policy above.
drop policy if exists vendor_invoice_items_read on public.vendor_invoice_items;
create policy vendor_invoice_items_read on public.vendor_invoice_items for select to authenticated
  using (exists (select 1 from public.vendor_invoices i where i.id = invoice_id));

-- ---------- receipts ----------
drop policy if exists vendor_receipts_read on public.vendor_receipts;
create policy vendor_receipts_read on public.vendor_receipts for select to authenticated
  using (public.is_vendor_owner(vendor_id)
         or client_id = auth.uid()
         or public.has_permission('payments.read'));

-- ---------- delivery history ----------
drop policy if exists vendor_document_deliveries_read on public.vendor_document_deliveries;
create policy vendor_document_deliveries_read on public.vendor_document_deliveries for select to authenticated
  using (public.is_vendor_owner(vendor_id) or public.has_permission('payments.read'));

-- =====================================================================
-- STORAGE: the PDFs that get attached to emails
--
-- Private. One file per document at `{vendor_id}/{invoice|receipt}/{id}.pdf`;
-- the browser renders it and uploads it, the Edge Function reads it with
-- the service role and attaches it. Only the vendor that owns the first
-- folder may write or read. Size and type are enforced by the bucket — an
-- upload policy runs before the object exists and cannot see its metadata.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('financial-documents', 'financial-documents', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- The path names a real, issued document of one of the caller's vendors:
-- `{vendor_id}/{invoice|receipt}/{document_id}.pdf`. Checking the document
-- itself (not just the folder) means a vendor cannot fill the bucket with
-- files under made-up ids, nor park a file for a draft that has no number.
create or replace function public.financial_document_path_owned(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_vendor uuid;
  v_kind   text;
  v_id     uuid;
begin
  if p_name is null or p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(invoice|receipt)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$' then
    return false;
  end if;

  v_vendor := split_part(p_name, '/', 1)::uuid;
  v_kind   := split_part(p_name, '/', 2);
  v_id     := replace(split_part(p_name, '/', 3), '.pdf', '')::uuid;

  if not public.is_vendor_owner(v_vendor) then
    return false;
  end if;

  if v_kind = 'invoice' then
    return exists (select 1 from public.vendor_invoices i
                    where i.id = v_id and i.vendor_id = v_vendor
                      and i.status <> 'draft' and i.deleted_at is null);
  end if;
  return exists (select 1 from public.vendor_receipts r where r.id = v_id and r.vendor_id = v_vendor);
end;$$;

revoke all on function public.financial_document_path_owned(text) from public, anon;
grant execute on function public.financial_document_path_owned(text) to authenticated;

drop policy if exists findocs_read on storage.objects;
create policy findocs_read on storage.objects for select to authenticated
  using (bucket_id = 'financial-documents'
         and (public.financial_document_path_owned(name) or public.has_permission('payments.read')));

drop policy if exists findocs_write on storage.objects;
create policy findocs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'financial-documents' and public.financial_document_path_owned(name));

-- Re-rendering a document (a void stamp) overwrites its file. What was
-- actually emailed stays provable through the delivery's sha256.
drop policy if exists findocs_modify on storage.objects;
create policy findocs_modify on storage.objects for update to authenticated
  using (bucket_id = 'financial-documents' and public.financial_document_path_owned(name))
  with check (bucket_id = 'financial-documents' and public.financial_document_path_owned(name));
