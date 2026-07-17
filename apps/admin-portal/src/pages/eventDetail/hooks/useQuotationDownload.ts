import { useCallback, useState } from 'react';
import { fetchQuotationDocument } from '@/hooks/queries';
import { downloadQuotationPdf } from '@/lib/quotationPdf';

/**
 * Downloads a quotation as a PDF. Quotations aren't stored files, so this
 * fetches the full document (header + line items) via `get_event_quotation`
 * and renders it client-side. Tracks the in-flight quotation id so a single
 * row can show a spinner without blocking the others.
 */
export function useQuotationDownload() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const download = useCallback(async (quotationId: string) => {
    setBusyId(quotationId);
    setErr(null);
    try {
      const doc = await fetchQuotationDocument(quotationId);
      downloadQuotationPdf(doc);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to build the quotation PDF.');
    } finally {
      setBusyId(null);
    }
  }, []);

  return { busyId, err, download, clearError: () => setErr(null) };
}
