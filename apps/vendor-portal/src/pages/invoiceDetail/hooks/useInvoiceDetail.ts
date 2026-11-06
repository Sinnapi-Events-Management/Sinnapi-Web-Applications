import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@sinnapi/ui';
import {
  documentErrorMessage,
  invoiceDisplayStatus,
  kampalaToday,
  toAmount,
  toInvoiceView,
} from '@sinnapi/ui/documents';
import {
  useDocumentDeliveries,
  useDuplicateInvoice,
  useInvoiceReceipts,
  useVendorInvoice,
  useVoidInvoice,
} from '@/hooks/documentQueries';
import { useLocationNotice } from '@/components/documents/hooks/useLocationNotice';
import { useDocumentDownload } from '@/components/documents/hooks/useDocumentDownload';
import type { SendTarget } from '@/components/documents/hooks/useSendDocument';

/**
 * One issued invoice: the document, the payments recorded against it, its
 * email history, and what the vendor can do next — record a payment, void
 * it, or copy it into a new draft.
 *
 * A draft has nothing to show here yet, so its URL forwards to the editor.
 */
export function useInvoiceDetail(invoiceId: string) {
  const navigate = useNavigate();
  const toast = useToast();
  useLocationNotice(toast.success);

  const invoice = useVendorInvoice(invoiceId);
  const receipts = useInvoiceReceipts(invoiceId);
  const deliveries = useDocumentDeliveries('invoice', invoiceId);
  const voidMutation = useVoidInvoice();
  const duplicate = useDuplicateInvoice();

  const download = useDocumentDownload();
  const [sendOpen, setSendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const row = invoice.data ?? null;

  useEffect(() => {
    if (row?.status === 'draft') navigate(`/invoices/${row.id}/edit`, { replace: true });
  }, [row, navigate]);

  const view = useMemo(() => (row ? toInvoiceView(row) : null), [row]);
  const display = row ? invoiceDisplayStatus(row.status, row.due_date, kampalaToday()) : null;

  const isBooking = row?.payment_channel === 'sinnapi_escrow';
  const activeReceipts = (receipts.data ?? []).filter((r) => r.status === 'issued');

  async function confirmVoid(reason: string) {
    if (!row) return;
    setVoidError(null);
    try {
      await voidMutation.mutateAsync({ id: row.id, reason });
      setVoidOpen(false);
      toast.success(`Invoice ${row.document_no} voided`);
    } catch (e) {
      setVoidError(documentErrorMessage(e, 'This invoice could not be voided.'));
    }
  }

  async function copyToDraft() {
    if (!row) return;
    try {
      const id = await duplicate.mutateAsync(row.id);
      navigate(`/invoices/${id}/edit`, { state: { notice: 'Copied into a new draft' } });
    } catch (e) {
      toast.error(documentErrorMessage(e, 'This invoice could not be copied.'));
    }
  }

  return {
    row,
    view,
    display,
    isLoading: invoice.isLoading,
    error: invoice.error,
    receipts: receipts.data ?? [],
    receiptsLoading: receipts.isLoading,
    deliveries: deliveries.data ?? [],
    deliveriesLoading: deliveries.isLoading,
    isBooking,
    canRecordPayment:
      !!row && !isBooking && (row.status === 'issued' || row.status === 'partially_paid'),
    // The database refuses these too; hiding them saves a refusal.
    canVoid:
      !!row &&
      row.status !== 'void' &&
      row.status !== 'draft' &&
      activeReceipts.length === 0 &&
      !(isBooking && row.status === 'paid'),
    voidBlockedReason:
      row && row.status !== 'void' && activeReceipts.length > 0
        ? 'To void this invoice, void its receipts first.'
        : null,
    canDuplicate: !!row && !isBooking,
    linked: row
      ? {
          id: row.id,
          documentNo: row.document_no ?? '',
          currency: row.currency,
          balanceDue: toAmount(row.balance_due),
        }
      : null,
    paymentOpen,
    openPayment: () => setPaymentOpen(true),
    closePayment: () => setPaymentOpen(false),
    paymentRecorded: (documentNo: string) => {
      setPaymentOpen(false);
      toast.success(`Payment recorded — receipt ${documentNo}`);
    },
    voidOpen,
    openVoid: () => {
      setVoidError(null);
      setVoidOpen(true);
    },
    closeVoid: () => setVoidOpen(false),
    confirmVoid,
    voidBusy: voidMutation.isPending,
    voidError,
    copyToDraft,
    copying: duplicate.isPending,
    downloading: download.busy,
    downloadError: download.error,
    download: () => view && download.downloadInvoice(view),
    canSend: !!row && row.status !== 'void' && row.status !== 'draft',
    sendTarget: (row && view
      ? {
          kind: 'invoice',
          id: row.id,
          vendorId: row.vendor_id,
          hasClientAccount: !!row.client_id,
          savedEmail: row.recipient_email,
          view,
        }
      : null) as SendTarget | null,
    sendOpen,
    openSend: () => setSendOpen(true),
    closeSend: () => setSendOpen(false),
    sent: (recipient: string) => {
      setSendOpen(false);
      toast.success(`Sent to ${recipient}`);
    },
    openReceipt: (id: string) => navigate(`/receipts/${id}`),
    toast: toast.toast,
    dismissToast: toast.dismiss,
  };
}

export type InvoiceDetailApi = ReturnType<typeof useInvoiceDetail>;
