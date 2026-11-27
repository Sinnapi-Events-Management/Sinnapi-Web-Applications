import { useCallback, useMemo, useState } from 'react';
import {
  RECEIPT_METHOD_LABELS,
  balanceLine,
  formatDocumentDate,
  formatDocumentMoney,
  toAmount,
  toReceiptView,
  type InvoiceRow,
  type ReceiptRow,
  type ReceiptView,
} from '@sinnapi/ui/documents';
import { useInvoiceReceipts } from '@/hooks/documentQueries';
import { useDocumentDownload } from '@/components/documents/hooks/useDocumentDownload';
import { useSendToSelf } from '@/components/documents/hooks/useSendToSelf';
import type { SendTarget } from '@/components/documents/hooks/sendFinancialDocument';

/** One receipt as the invoice page lists it: display text ready, and what it can do. */
export type ReceiptItem = {
  id: string;
  documentNo: string;
  isVoid: boolean;
  status: ReceiptRow['status'];
  amount: string;
  /** "6 Nov 2026 · Mobile Money" */
  meta: string;
  /** "Balance after: UGX 135,500" / "Overpaid by: UGX 50,000" */
  after: string | null;
  afterOverpaid: boolean;
  view: ReceiptView;
  sendTarget: SendTarget;
};

function toItem(r: ReceiptRow): ReceiptItem {
  const view = toReceiptView(r);
  const after =
    r.balance_after === null
      ? null
      : balanceLine(toAmount(r.balance_after), r.currency, 'Left to pay');
  return {
    id: r.id,
    documentNo: r.document_no,
    isVoid: r.status === 'void',
    status: r.status,
    amount: formatDocumentMoney(r.amount, r.currency),
    meta: `${formatDocumentDate(r.payment_date)} · ${RECEIPT_METHOD_LABELS[r.payment_method]}`,
    after: after && r.status !== 'void' ? `${after.label}: ${after.value}` : null,
    afterOverpaid: !!after?.overpaid,
    view,
    sendTarget: {
      kind: 'receipt',
      id: r.id,
      vendorId: r.vendor_id,
      hasClientAccount: !!r.client_id,
      savedEmail: r.recipient_email,
      view,
    },
  };
}

/**
 * The receipts on one invoice and everything the list can do with each one
 * without leaving the page: preview, download, email the client, email
 * yourself. Opening the email dialog is the caller's (one dialog serves the
 * invoice and its receipts).
 */
export function useInvoiceReceiptList(
  invoice: InvoiceRow | null,
  notify: { success: (m: string) => void; error: (m: string) => void },
) {
  const receipts = useInvoiceReceipts(invoice?.id);
  const download = useDocumentDownload();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReceiptItem | null>(null);

  const selfSend = useSendToSelf({
    onSent: (to) => notify.success(`Copy sent to ${to}`),
    onError: notify.error,
  });

  const items = useMemo(() => (receipts.data ?? []).map(toItem), [receipts.data]);
  const live = items.filter((r) => !r.isVoid);

  const downloadReceipt = useCallback(
    async (item: ReceiptItem) => {
      setDownloadingId(item.id);
      await download.downloadReceipt(item.view);
      setDownloadingId(null);
    },
    [download],
  );

  return {
    items,
    liveCount: live.length,
    voidCount: items.length - live.length,
    loading: receipts.isLoading,
    loadError: receipts.error ? 'The receipts could not be loaded.' : null,
    downloadingId,
    downloadError: download.error,
    download: downloadReceipt,
    emailingSelfId: selfSend.sendingId,
    emailSelf: (item: ReceiptItem) => selfSend.send(item.sendTarget),
    preview,
    openPreview: setPreview,
    closePreview: () => setPreview(null),
    hasLiveReceipts: live.length > 0,
    currency: invoice?.currency ?? 'UGX',
  };
}

export type InvoiceReceiptListApi = ReturnType<typeof useInvoiceReceiptList>;
