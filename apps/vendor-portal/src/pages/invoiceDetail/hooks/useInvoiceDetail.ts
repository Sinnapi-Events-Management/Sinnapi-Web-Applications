import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@sinnapi/ui';
import {
  documentErrorMessage,
  invoiceDisplayStatus,
  kampalaToday,
  paymentCoverage,
  toAmount,
  toInvoiceView,
} from '@sinnapi/ui/documents';
import {
  useDocumentDeliveries,
  useDuplicateInvoice,
  useVendorInvoice,
  useVoidInvoice,
} from '@/hooks/documentQueries';
import { useLocationNotice } from '@/components/documents/hooks/useLocationNotice';
import { useDocumentDownload } from '@/components/documents/hooks/useDocumentDownload';
import { useSendToSelf } from '@/components/documents/hooks/useSendToSelf';
import type { SendTarget } from '@/components/documents/hooks/sendFinancialDocument';
import { useInvoiceReceiptList } from './useInvoiceReceiptList';

/** Statuses an invoice can take a (further) payment in. Paid/overpaid ask "record anyway?" first. */
const PAYABLE = new Set(['issued', 'partially_paid', 'paid', 'overpaid']);

/**
 * One issued invoice: the document, how its receipts compare with its
 * total, its email history, and what the vendor can do next — record a
 * payment, email it (to the client or only to themselves), download it,
 * void it, or copy it into a new draft.
 *
 * The receipt list's own state lives in `useInvoiceReceiptList`. One email
 * dialog serves the invoice and its receipts: `openSend` takes whichever.
 *
 * A draft has nothing to show here yet, so its URL forwards to the editor.
 */
export function useInvoiceDetail(invoiceId: string) {
  const navigate = useNavigate();
  const toast = useToast();
  useLocationNotice(toast.success);

  const invoice = useVendorInvoice(invoiceId);
  const deliveries = useDocumentDeliveries('invoice', invoiceId);
  const voidMutation = useVoidInvoice();
  const duplicate = useDuplicateInvoice();
  const download = useDocumentDownload();

  const row = invoice.data ?? null;
  const receipts = useInvoiceReceiptList(row, toast);
  const selfSend = useSendToSelf({
    onSent: (to) => toast.success(`Copy sent to ${to}`),
    onError: toast.error,
  });

  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  useEffect(() => {
    if (row?.status === 'draft') navigate(`/invoices/${row.id}/edit`, { replace: true });
  }, [row, navigate]);

  const view = useMemo(() => (row ? toInvoiceView(row) : null), [row]);
  const display = row ? invoiceDisplayStatus(row.status, row.due_date, kampalaToday()) : null;
  const coverage = row
    ? paymentCoverage(toAmount(row.total), toAmount(row.amount_paid), row.currency)
    : null;

  const isBooking = row?.payment_channel === 'sinnapi_escrow';
  const isVoid = row?.status === 'void';
  const invoiceTarget: SendTarget | null =
    row && view && !isVoid
      ? {
          kind: 'invoice',
          id: row.id,
          vendorId: row.vendor_id,
          hasClientAccount: !!row.client_id,
          savedEmail: row.recipient_email,
          view,
        }
      : null;

  async function confirmVoid(reason: string) {
    if (!row) return;
    setVoidError(null);
    try {
      await voidMutation.mutateAsync({ id: row.id, reason });
      setVoidOpen(false);
      toast.success(`Invoice ${row.document_no} cancelled`);
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
    coverage,
    isLoading: invoice.isLoading,
    error: invoice.error,
    receipts,
    deliveries: deliveries.data ?? [],
    deliveriesLoading: deliveries.isLoading,
    isBooking,
    canRecordPayment: !!row && !isBooking && PAYABLE.has(row.status),
    // Settled already: the button says so, and the form asks before recording.
    recordPaymentLabel:
      row?.status === 'paid' || row?.status === 'overpaid'
        ? 'Record an extra payment'
        : 'Record payment',
    // The database refuses these too; hiding them saves a refusal.
    canVoid:
      !!row &&
      !isVoid &&
      row.status !== 'draft' &&
      !receipts.hasLiveReceipts &&
      !(isBooking && row.status === 'paid'),
    voidBlockedReason:
      row && !isVoid && receipts.hasLiveReceipts
        ? 'To cancel this invoice, cancel its receipts first.'
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
    canSend: !!invoiceTarget,
    emailInvoice: () => setSendTarget(invoiceTarget),
    emailInvoiceToSelf: () => selfSend.send(invoiceTarget),
    emailingSelf: selfSend.sendingId === row?.id,
    sendTarget,
    openSend: setSendTarget,
    closeSend: () => setSendTarget(null),
    sent: (recipient: string) => {
      setSendTarget(null);
      toast.success(`Sent to ${recipient}`);
    },
    openReceipt: (id: string) => navigate(`/receipts/${id}`),
    toast: toast.toast,
    dismissToast: toast.dismiss,
  };
}

export type InvoiceDetailApi = ReturnType<typeof useInvoiceDetail>;
