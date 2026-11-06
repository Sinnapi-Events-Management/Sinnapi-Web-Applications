import { Toast } from '@sinnapi/ui';
import { ReceiptPreview } from '@sinnapi/ui/documents';
import VoidDialog from '@/components/documents/organisms/VoidDialog';
import PreviewDialog from '@/components/documents/organisms/PreviewDialog';
import RecordPaymentDialog from '@/components/documents/organisms/RecordPaymentDialog';
import SendDocumentDialog from '@/components/documents/organisms/SendDocumentDialog';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';

/**
 * Every overlay the invoice page can open, in one place. One email dialog
 * serves the invoice and each of its receipts — whichever `sendTarget` is.
 */
export default function InvoiceDialogs({ d }: { d: InvoiceDetailApi }) {
  const row = d.row!;
  const preview = d.receipts.preview;
  return (
    <>
      <RecordPaymentDialog
        open={d.paymentOpen}
        invoice={d.linked}
        onClose={d.closePayment}
        onRecorded={d.paymentRecorded}
      />
      <VoidDialog
        open={d.voidOpen}
        noun="invoice"
        documentNo={row.document_no ?? ''}
        consequence="The invoice stays in your records, marked CANCELLED, and nothing more can be paid against it. Your client will still see it, marked cancelled."
        busy={d.voidBusy}
        error={d.voidError}
        onConfirm={d.confirmVoid}
        onClose={d.closeVoid}
      />
      <SendDocumentDialog
        open={!!d.sendTarget}
        target={d.sendTarget}
        documentNo={d.sendTarget?.view.documentNo ?? ''}
        onClose={d.closeSend}
        onSent={d.sent}
      />
      <PreviewDialog
        open={!!preview}
        title={preview ? `Receipt ${preview.documentNo}` : 'Receipt'}
        onClose={d.receipts.closePreview}
      >
        {preview && <ReceiptPreview receipt={preview.view} />}
      </PreviewDialog>
      <Toast toast={d.toast} onClose={d.dismissToast} />
    </>
  );
}
