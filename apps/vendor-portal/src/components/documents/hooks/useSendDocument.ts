import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { documentErrorMessage, type InvoiceView, type ReceiptView } from '@sinnapi/ui/documents';
import { supabase } from '@/lib/supabase';
import { invokeFunction } from '@/lib/functions';

export type SendTarget = {
  kind: 'invoice' | 'receipt';
  id: string;
  vendorId: string;
  /** Set for a registered client: their Sinnapi email is the default, kept private. */
  hasClientAccount: boolean;
  /** The external recipient's saved address, if any. */
  savedEmail: string | null;
  view: InvoiceView | ReceiptView;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Emailing an issued invoice or receipt, PDF attached.
 *
 *   1. render the PDF from the stored record (the same file "Download" gives)
 *   2. upload it privately to `financial-documents/{vendor}/{kind}/{id}.pdf`
 *   3. ask `send-financial-document` to send it — the function re-reads the
 *      record, checks ownership and the daily limit, attaches the file and
 *      logs the attempt
 *
 * One request key per open dialog: a double-click, or a retry after a lost
 * response, is recognised by the server and sends nothing twice.
 */
export function useSendDocument(target: SendTarget, onSent: (recipient: string) => void) {
  const qc = useQueryClient();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [mode, setMode] = useState<'account' | 'address'>(
    target.hasClientAccount ? 'account' : 'address',
  );
  const [address, setAddress] = useState(target.savedEmail ?? '');
  const [message, setMessage] = useState('');
  const [ccSelf, setCcSelf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressValid = EMAIL_RE.test(address.trim());
  const canSend = !busy && (mode === 'account' || addressValid) && message.length <= 2000;

  async function send() {
    if (!canSend) return;
    setBusy(true);
    setError(null);
    try {
      const pdf = await import('@sinnapi/utils/financialPdf');
      const blob =
        target.kind === 'invoice'
          ? await pdf.invoicePdfBlob(target.view as InvoiceView)
          : await pdf.receiptPdfBlob(target.view as ReceiptView);

      const path = `${target.vendorId}/${target.kind}/${target.id}.pdf`;
      const upload = await supabase.storage
        .from('financial-documents')
        .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
      if (upload.error) throw upload.error;

      const { data, error: sendError } = await invokeFunction<{
        recipient?: string;
        status?: string;
      }>('send-financial-document', {
        kind: target.kind,
        id: target.id,
        to: mode === 'account' ? 'client_account' : address.trim().toLowerCase(),
        ccSelf,
        message: message.trim() || null,
        requestKey,
      });
      if (sendError) throw new Error(sendError);

      qc.invalidateQueries({ queryKey: ['v-doc-deliveries', target.kind, target.id] });
      onSent(data?.recipient ?? (mode === 'account' ? 'their Sinnapi email' : address.trim()));
    } catch (e) {
      // A failed send is still recorded in the history; refresh it either way.
      qc.invalidateQueries({ queryKey: ['v-doc-deliveries', target.kind, target.id] });
      setError(documentErrorMessage(e, 'The email could not be sent. Try again shortly.'));
    } finally {
      setBusy(false);
    }
  }

  return {
    mode,
    setMode,
    address,
    setAddress,
    addressValid,
    message,
    setMessage,
    ccSelf,
    setCcSelf,
    busy,
    error,
    canSend,
    send,
  };
}
