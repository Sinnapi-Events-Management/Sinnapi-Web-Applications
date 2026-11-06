import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PageParams, Paged } from '@sinnapi/ui';
import type { InvoiceRow, ReceiptRow } from '@sinnapi/ui/documents';
import { supabase } from '@/lib/supabase';

/**
 * The invoices and receipts vendors have issued to this client. Read-only:
 * a client never writes a financial document.
 *
 * RLS already limits these to issued documents addressed to the caller,
 * but an account can be a vendor too — and a vendor's RLS shows their OWN
 * documents. So every read here also filters `client_id = me`, which keeps
 * a dual-role user's vendor paperwork out of their client inbox.
 */

export type ClientInvoiceListRow = Pick<
  InvoiceRow,
  | 'id'
  | 'document_no'
  | 'status'
  | 'payment_channel'
  | 'vendor_snapshot'
  | 'title'
  | 'currency'
  | 'total'
  | 'balance_due'
  | 'issue_date'
  | 'due_date'
>;

export type ClientReceiptListRow = Pick<
  ReceiptRow,
  | 'id'
  | 'document_no'
  | 'status'
  | 'vendor_snapshot'
  | 'currency'
  | 'amount'
  | 'payment_date'
  | 'description'
>;

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Your session has expired. Sign in again and retry.');
  return data.user.id;
}

function range(params: PageParams) {
  const from = params.page * params.pageSize;
  return { from, to: from + params.pageSize - 1 };
}

export function useClientInvoices(params: PageParams) {
  return useQuery({
    queryKey: ['c-invoices', params.page, params.pageSize, params.sort],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<ClientInvoiceListRow>> => {
      const me = await myId();
      const sort = params.sort ?? { field: 'issue_date', direction: 'desc' as const };
      const { from, to } = range(params);
      const { data, error, count } = await supabase
        .from('vendor_invoices')
        .select(
          'id,document_no,status,payment_channel,vendor_snapshot,title,currency,total,balance_due,issue_date,due_date',
          {
            count: 'exact',
          },
        )
        .eq('client_id', me)
        .neq('status', 'draft')
        .order(sort.field, { ascending: sort.direction === 'asc' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as ClientInvoiceListRow[], total: count ?? 0 };
    },
  });
}

export function useClientReceipts(params: PageParams) {
  return useQuery({
    queryKey: ['c-receipts', params.page, params.pageSize, params.sort],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Paged<ClientReceiptListRow>> => {
      const me = await myId();
      const sort = params.sort ?? { field: 'payment_date', direction: 'desc' as const };
      const { from, to } = range(params);
      const { data, error, count } = await supabase
        .from('vendor_receipts')
        .select('id,document_no,status,vendor_snapshot,currency,amount,payment_date,description', {
          count: 'exact',
        })
        .eq('client_id', me)
        .order(sort.field, { ascending: sort.direction === 'asc' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as ClientReceiptListRow[], total: count ?? 0 };
    },
  });
}

export function useClientInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['c-invoice', id],
    enabled: !!id,
    queryFn: async () => {
      const me = await myId();
      const { data, error } = await supabase
        .from('vendor_invoices')
        .select(
          '*,vendor_invoice_items(id,kind,description,quantity,unit_price,line_total,sort_order)',
        )
        .eq('id', id!)
        .eq('client_id', me)
        .neq('status', 'draft')
        .maybeSingle();
      if (error) throw error;
      return (data as InvoiceRow | null) ?? null;
    },
  });
}

export function useClientReceipt(id: string | undefined) {
  return useQuery({
    queryKey: ['c-receipt', id],
    enabled: !!id,
    queryFn: async () => {
      const me = await myId();
      const { data, error } = await supabase
        .from('vendor_receipts')
        .select('*,vendor_invoices(document_no,total)')
        .eq('id', id!)
        .eq('client_id', me)
        .maybeSingle();
      if (error) throw error;
      return (data as ReceiptRow | null) ?? null;
    },
  });
}
