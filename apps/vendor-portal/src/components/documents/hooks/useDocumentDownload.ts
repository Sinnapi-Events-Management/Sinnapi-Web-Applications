import { useCallback, useState } from 'react';
import type { InvoiceView, ReceiptView } from '@sinnapi/ui/documents';

/**
 * "Download PDF". The renderer (and jsPDF with it) is imported on the first
 * click, not with the page, so it never weighs on first paint.
 */
export function useDocumentDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch {
      setError('The PDF could not be created. Try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    busy,
    error,
    downloadInvoice: (view: InvoiceView) =>
      run(async () => (await import('@sinnapi/utils/financialPdf')).downloadInvoicePdf(view)),
    downloadReceipt: (view: ReceiptView) =>
      run(async () => (await import('@sinnapi/utils/financialPdf')).downloadReceiptPdf(view)),
  };
}
