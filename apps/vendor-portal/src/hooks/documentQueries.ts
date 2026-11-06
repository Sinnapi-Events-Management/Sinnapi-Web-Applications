import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PageParams, Paged } from '@sinnapi/ui';
import {
  kampalaToday,
  type ContactRow,
  type DeliveryRow,
  type InvoiceFilter,
  type InvoiceRow,
  type ReceiptRow,
  type VendorSnapshot,
} from '@sinnapi/ui/documents';
import { supabase } from '@/lib/supabase';

/**
 * Vendor invoices, receipts and saved clients.
 *
 * In a file of its own rather than appended to `queries.ts`: the feature is
 * self-contained, and every write here is an RPC (1105f) — RLS grants no
 * direct writes to invoices or receipts — so the reads and the writes sit
 * together where one invalidation map covers both.
 *
 * Unlike `paginate`, these list reads raise their PostgREST error, so a
 * failed request shows as an error, not as "no invoices yet".
 */

const INVOICE_LIST_COLUMNS =
  'id,document_no,status,payment_channel,client_id,contact_id,recipient_name,title,currency,' +
  'total,amount_paid,balance_due,issue_date,due_date,created_at,updated_at';

export type InvoiceListRow = Pick<
  InvoiceRow,
  | 'id'
  | 'document_no'
  | 'status'
  | 'payment_channel'
  | 'client_id'
  | 'contact_id'
  | 'recipient_name'
  | 'title'
  | 'currency'
  | 'total'
  | 'amount_paid'
  | 'balance_due'
  | 'issue_date'
  | 'due_date'
  | 'created_at'
  | 'updated_at'
>;

const RECEIPT_LIST_COLUMNS =
  'id,document_no,status,invoice_id,client_id,recipient_name,currency,amount,payment_date,' +
  'payment_method,description,created_at,vendor_invoices(document_no,total)';

export type ReceiptListRow = Pick<
  ReceiptRow,
  | 'id'
  | 'document_no'
  | 'status'
  | 'invoice_id'
  | 'client_id'
  | 'recipient_name'
  | 'currency'
  | 'amount'
  | 'payment_date'
  | 'payment_method'
  | 'description'
  | 'created_at'
  | 'vendor_invoices'
>;

/** Characters that would break a PostgREST `or=(…)` filter. */
function searchTerm(raw: string): string {
  return raw.replace(/[,()*%\\]/g, ' ').trim();
}

function range(params: PageParams) {
  const from = params.page * params.pageSize;
  return { from, to: from + params.pageSize - 1 };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function useVendorInvoices(
  vendorId: string | undefined,
  params: PageParams,
  filter: InvoiceFilter,
  search: string,
) {
  return useQuery({
    queryKey: ['v-invoices', vendorId, filter, search, params.page, params.pageSize, params.sort],
    enabled: !!vendorId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<InvoiceListRow>> => {
      let q = supabase
        .from('vendor_invoices')
        .select(INVOICE_LIST_COLUMNS, { count: 'exact' })
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null);

      if (filter === 'unpaid') q = q.in('status', ['issued', 'partially_paid']);
      if (filter === 'overdue')
        q = q.in('status', ['issued', 'partially_paid']).lt('due_date', kampalaToday());
      // "Paid" includes overpaid: both are settled; the chip tells them apart.
      if (filter === 'paid') q = q.in('status', ['paid', 'overpaid']);
      if (filter === 'draft' || filter === 'void') q = q.eq('status', filter);

      const term = searchTerm(search);
      if (term)
        q = q.or(
          `document_no.ilike.%${term}%,recipient_name.ilike.%${term}%,title.ilike.%${term}%`,
        );

      const sort = params.sort ?? { field: 'created_at', direction: 'desc' as const };
      const { from, to } = range(params);
      const { data, error, count } = await q
        .order(sort.field, { ascending: sort.direction === 'asc' })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as InvoiceListRow[], total: count ?? 0 };
    },
  });
}

export function useVendorReceipts(
  vendorId: string | undefined,
  params: PageParams,
  search: string,
) {
  return useQuery({
    queryKey: ['v-receipts', vendorId, search, params.page, params.pageSize, params.sort],
    enabled: !!vendorId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<ReceiptListRow>> => {
      let q = supabase
        .from('vendor_receipts')
        .select(RECEIPT_LIST_COLUMNS, { count: 'exact' })
        .eq('vendor_id', vendorId!);

      const term = searchTerm(search);
      if (term)
        q = q.or(
          `document_no.ilike.%${term}%,recipient_name.ilike.%${term}%,description.ilike.%${term}%`,
        );

      const sort = params.sort ?? { field: 'payment_date', direction: 'desc' as const };
      const { from, to } = range(params);
      const { data, error, count } = await q
        .order(sort.field, { ascending: sort.direction === 'asc' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as ReceiptListRow[], total: count ?? 0 };
    },
  });
}

/** A booking's live invoice, if it has one (at most one — enforced by a unique index). */
export function useBookingInvoice(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['v-booking-invoice', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select('id,document_no,status,due_date,balance_due,currency')
        .eq('booking_id', bookingId!)
        .neq('status', 'void')
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data as Pick<
        InvoiceRow,
        'id' | 'document_no' | 'status' | 'due_date' | 'balance_due' | 'currency'
      > | null;
    },
  });
}

export function useVendorInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['v-invoice', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select(
          '*,vendor_invoice_items(id,kind,description,quantity,unit_price,line_total,sort_order)',
        )
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return (data as InvoiceRow | null) ?? null;
    },
  });
}

/**
 * The receipts recorded against one invoice, newest first — whole rows, so
 * the invoice page can preview, print and email each one without opening it.
 * An invoice has a handful of receipts, so the extra columns cost nothing.
 */
export function useInvoiceReceipts(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['v-invoice-receipts', invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_receipts')
        .select('*,vendor_invoices(document_no,total)')
        .eq('invoice_id', invoiceId!)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReceiptRow[];
    },
  });
}

export function useVendorReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ['v-receipt', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_receipts')
        .select('*,vendor_invoices(document_no,total)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as ReceiptRow | null) ?? null;
    },
  });
}

export function useDocumentDeliveries(kind: 'invoice' | 'receipt', id: string | undefined) {
  return useQuery({
    queryKey: ['v-doc-deliveries', kind, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_document_deliveries')
        .select(
          'id,invoice_id,receipt_id,recipient_kind,recipient_display,subject,status,error,created_at,sent_at',
        )
        .eq(kind === 'invoice' ? 'invoice_id' : 'receipt_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeliveryRow[];
    },
  });
}

export type DocumentSummaryRow = {
  currency: string;
  outstanding: number;
  open_count: number;
  overdue_amount: number;
  overdue_count: number;
};

export function useDocumentSummary(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['v-doc-summary', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('vendor_document_summary');
      if (error) throw error;
      return (data ?? []) as DocumentSummaryRow[];
    },
  });
}

export function useVendorContacts(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['v-contacts', vendorId],
    enabled: !!vendorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_contacts')
        .select('*')
        .eq('vendor_id', vendorId!)
        .is('deleted_at', null)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ContactRow[];
    },
  });
}

/**
 * The vendor's details as `issue_invoice` would freeze them, for previewing
 * a draft. Mirrors `_vendor_snapshot` (1105f): the TIN only when asked for,
 * the account email only for external recipients.
 */
export function useVendorBusinessCard(vendorId: string | undefined) {
  return useQuery({
    queryKey: ['v-business-card', vendorId],
    enabled: !!vendorId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: vendor, error }, { data: auth }] = await Promise.all([
        supabase
          .from('vendors')
          .select(
            'business_name,profile_image_url,primary_image_url,business_location,base_city,website,business_reg_number,tax_id,owner_id',
          )
          .eq('id', vendorId!)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);
      if (error) throw error;
      if (!vendor) return null;
      const { data: owner } = await supabase
        .from('profiles')
        .select('phone,email')
        .eq('id', auth.user?.id ?? vendor.owner_id)
        .maybeSingle();
      return {
        business_name: vendor.business_name as string,
        logo_url: (vendor.profile_image_url ?? vendor.primary_image_url) as string | null,
        location: vendor.business_location as string | null,
        city: vendor.base_city as string | null,
        website: vendor.website as string | null,
        registration_no: vendor.business_reg_number as string | null,
        tax_id: vendor.tax_id as string | null,
        phone: (owner?.phone as string | null) ?? null,
        email: (owner?.email as string | null) ?? null,
      };
    },
  });
}

/** Shape the live card the way the frozen snapshot would read for this recipient. */
export function snapshotFor(
  card: (VendorSnapshot & { tax_id?: string | null; email?: string | null }) | null | undefined,
  opts: { showTaxId: boolean; external: boolean },
): VendorSnapshot | null {
  if (!card) return null;
  return {
    ...card,
    tax_id: opts.showTaxId ? card.tax_id : null,
    email: opts.external ? card.email : null,
  };
}

// ---------------------------------------------------------------------------
// Writes — every one an RPC
// ---------------------------------------------------------------------------

function useInvalidateDocuments() {
  const qc = useQueryClient();
  return (ids: { invoiceId?: string | null; receiptId?: string | null } = {}) => {
    qc.invalidateQueries({ queryKey: ['v-invoices'] });
    qc.invalidateQueries({ queryKey: ['v-receipts'] });
    qc.invalidateQueries({ queryKey: ['v-doc-summary'] });
    qc.invalidateQueries({ queryKey: ['v-contacts'] });
    qc.invalidateQueries({ queryKey: ['v-booking-invoice'] });
    if (ids.invoiceId) {
      qc.invalidateQueries({ queryKey: ['v-invoice', ids.invoiceId] });
      qc.invalidateQueries({ queryKey: ['v-invoice-receipts', ids.invoiceId] });
    }
    if (ids.receiptId) qc.invalidateQueries({ queryKey: ['v-receipt', ids.receiptId] });
  };
}

export type InvoiceDraftPayload = Record<string, unknown>;

export function useSaveInvoiceDraft() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (input: { id: string | null; draft: InvoiceDraftPayload }) => {
      const { data, error } = await supabase.rpc('save_invoice_draft', {
        p_invoice_id: input.id,
        p_draft: input.draft,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => invalidate({ invoiceId: id }),
  });
}

export function useIssueInvoice() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('issue_invoice', { p_invoice_id: id });
      if (error) throw error;
      return data as { id: string; document_no: string; status: string };
    },
    onSuccess: (res) => invalidate({ invoiceId: res.id }),
  });
}

export function useVoidInvoice() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const { error } = await supabase.rpc('void_invoice', {
        p_invoice_id: input.id,
        p_reason: input.reason,
      });
      if (error) throw error;
      return input.id;
    },
    onSuccess: (id) => invalidate({ invoiceId: id }),
  });
}

export function useDuplicateInvoice() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('duplicate_invoice', { p_invoice_id: id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteInvoiceDraft() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_invoice_draft', { p_invoice_id: id });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => invalidate({ invoiceId: id }),
  });
}

export function useCreateInvoiceFromBooking() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.rpc('create_invoice_from_booking', {
        p_booking_id: bookingId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => invalidate({ invoiceId: id }),
  });
}

export function useRecordReceipt() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await supabase.rpc('record_receipt', { p_receipt: payload });
      if (error) throw error;
      return data as { id: string; document_no: string; invoice_status: string | null };
    },
    onSuccess: (res, payload) =>
      invalidate({
        receiptId: res.id,
        invoiceId: (payload.invoice_id as string | undefined) ?? null,
      }),
  });
}

export function useVoidReceipt() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string; invoiceId: string | null }) => {
      const { error } = await supabase.rpc('void_receipt', {
        p_receipt_id: input.id,
        p_reason: input.reason,
      });
      if (error) throw error;
      return input;
    },
    onSuccess: (input) => invalidate({ receiptId: input.id, invoiceId: input.invoiceId }),
  });
}

export type ContactInput = {
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

/** Saved clients are plain vendor-owned rows: written directly under RLS. */
export function useSaveContact(vendorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string | null; values: ContactInput }) => {
      const query = input.id
        ? supabase.from('vendor_contacts').update(input.values).eq('id', input.id)
        : supabase
            .from('vendor_contacts')
            .insert({ ...input.values, vendor_id: vendorId, source: 'manual' });
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v-contacts', vendorId] }),
  });
}

export function useDeleteContact(vendorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Routed to a soft delete by tg_soft_delete; issued documents keep their copy.
      const { error } = await supabase.from('vendor_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['v-contacts', vendorId] }),
  });
}
