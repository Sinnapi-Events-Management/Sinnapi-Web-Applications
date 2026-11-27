import type { InvoiceView, ReceiptView } from '@sinnapi/ui/documents';
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

export type SendRecipient = 'client_account' | 'self' | string;

/**
 * Email an issued invoice or receipt, PDF attached. Not a hook, so the
 * dialog and the one-tap "Email to myself" share exactly one path.
 *
 *   1. render the PDF from the stored record (the same file "Download" gives)
 *   2. upload it privately to `financial-documents/{vendor}/{kind}/{id}.pdf`
 *   3. ask `send-financial-document` to send it — the function re-reads the
 *      record, checks ownership and the daily limit, attaches the file and
 *      logs the attempt
 *
 * `requestKey` makes a retry safe: the server sends nothing twice for one key.
 * Resolves to what the server says it sent to (masked for registered clients).
 */
export async function sendFinancialDocument(
  target: SendTarget,
  opts: { to: SendRecipient; ccSelf: boolean; message: string | null; requestKey: string },
): Promise<string | null> {
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

  const { data, error } = await invokeFunction<{ recipient?: string; status?: string }>(
    'send-financial-document',
    {
      kind: target.kind,
      id: target.id,
      to: opts.to,
      ccSelf: opts.to === 'self' ? false : opts.ccSelf,
      message: opts.message,
      requestKey: opts.requestKey,
    },
  );
  if (error) throw new Error(error);
  return data?.recipient ?? null;
}
