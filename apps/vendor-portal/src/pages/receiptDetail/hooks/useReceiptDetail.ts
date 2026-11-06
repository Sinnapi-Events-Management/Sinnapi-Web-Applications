import { useMemo, useState } from 'react';
import { useToast } from '@sinnapi/ui';
import { documentErrorMessage, toReceiptView } from '@sinnapi/ui/documents';
import { useDocumentDeliveries, useVendorReceipt, useVoidReceipt } from '@/hooks/documentQueries';
import { useLocationNotice } from '@/components/documents/hooks/useLocationNotice';
import { useDocumentDownload } from '@/components/documents/hooks/useDocumentDownload';
import { useSendToSelf } from '@/components/documents/hooks/useSendToSelf';
import type { SendTarget } from '@/components/documents/hooks/useSendDocument';

function sendTargetFor(
  row: ReturnType<typeof useVendorReceipt>['data'] | null,
  view: ReturnType<typeof toReceiptView> | null,
): SendTarget | null {
  if (!row || !view) return null;
  return {
    kind: 'receipt',
    id: row.id,
    vendorId: row.vendor_id,
    hasClientAccount: !!row.client_id,
    savedEmail: row.recipient_email,
    view,
  };
}

/** One receipt, its email history, emailing it, and voiding it. */
export function useReceiptDetail(receiptId: string) {
  const toast = useToast();
  useLocationNotice(toast.success);

  const receipt = useVendorReceipt(receiptId);
  const deliveries = useDocumentDeliveries('receipt', receiptId);
  const voidMutation = useVoidReceipt();
  const download = useDocumentDownload();
  const selfSend = useSendToSelf({
    onSent: (to) => toast.success(`Copy sent to ${to}`),
    onError: toast.error,
  });
  const [sendOpen, setSendOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const row = receipt.data ?? null;
  const view = useMemo(() => (row ? toReceiptView(row) : null), [row]);

  async function confirmVoid(reason: string) {
    if (!row) return;
    setVoidError(null);
    try {
      await voidMutation.mutateAsync({ id: row.id, reason, invoiceId: row.invoice_id });
      setVoidOpen(false);
      toast.success(`Receipt ${row.document_no} cancelled`);
    } catch (e) {
      setVoidError(documentErrorMessage(e, 'This receipt could not be voided.'));
    }
  }

  return {
    row,
    view,
    isLoading: receipt.isLoading,
    error: receipt.error,
    deliveries: deliveries.data ?? [],
    deliveriesLoading: deliveries.isLoading,
    voidOpen,
    openVoid: () => {
      setVoidError(null);
      setVoidOpen(true);
    },
    closeVoid: () => setVoidOpen(false),
    confirmVoid,
    voidBusy: voidMutation.isPending,
    voidError,
    downloading: download.busy,
    downloadError: download.error,
    download: () => view && download.downloadReceipt(view),
    sendTarget: sendTargetFor(row, view),
    sendOpen,
    openSend: () => setSendOpen(true),
    emailSelf: () => selfSend.send(sendTargetFor(row, view)),
    emailingSelf: !!selfSend.sendingId,
    closeSend: () => setSendOpen(false),
    sent: (recipient: string) => {
      setSendOpen(false);
      toast.success(`Sent to ${recipient}`);
    },
    toast: toast.toast,
    dismissToast: toast.dismiss,
  };
}
