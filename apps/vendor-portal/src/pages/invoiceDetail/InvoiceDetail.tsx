import { useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, PageTitle, Stack, Toast } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { InvoicePreview, documentErrorMessage } from '@sinnapi/ui/documents';
import VendorGate from '@/vendor/VendorGate';
import VoidDialog from '@/components/documents/organisms/VoidDialog';
import DeliveryHistory from '@/components/documents/organisms/DeliveryHistory';
import RecordPaymentDialog from '@/components/documents/organisms/RecordPaymentDialog';
import SendDocumentDialog from '@/components/documents/organisms/SendDocumentDialog';
import { useInvoiceDetail } from './hooks/useInvoiceDetail';
import InvoiceActionsCard from './components/organisms/InvoiceActionsCard';
import PaymentsCard from './components/organisms/PaymentsCard';

function Workspace({ invoiceId }: { invoiceId: string }) {
  const d = useInvoiceDetail(invoiceId);

  if (d.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (d.error)
    return (
      <Alert severity="error">
        {documentErrorMessage(d.error, 'This invoice could not be loaded.')}
      </Alert>
    );
  if (!d.row || !d.view) {
    return (
      <EmptyState
        title="Invoice not found"
        description="It may have been deleted."
        ctaLabel="Back to invoices"
        ctaHref="/invoices"
      />
    );
  }
  if (d.row.status === 'draft') return null; // forwarding to the editor

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ flex: '999 1 600px', minWidth: 0, order: { xs: 2, md: 1 } }}>
          <InvoicePreview invoice={d.view} />
        </Box>
        <Stack spacing={2} sx={{ flex: '1 1 300px', minWidth: 0, order: { xs: 1, md: 2 } }}>
          <InvoiceActionsCard d={d} />
          <PaymentsCard d={d} />
          <DeliveryHistory deliveries={d.deliveries} loading={d.deliveriesLoading} />
        </Stack>
      </Box>

      <RecordPaymentDialog
        open={d.paymentOpen}
        invoice={d.linked}
        onClose={d.closePayment}
        onRecorded={d.paymentRecorded}
      />
      <VoidDialog
        open={d.voidOpen}
        noun="invoice"
        documentNo={d.row.document_no ?? ''}
        consequence="The invoice stays in your records, stamped VOID, and nothing more can be paid against it. Your client will still see it, marked void."
        busy={d.voidBusy}
        error={d.voidError}
        onConfirm={d.confirmVoid}
        onClose={d.closeVoid}
      />
      <SendDocumentDialog
        open={d.sendOpen}
        target={d.sendTarget}
        documentNo={d.row.document_no ?? ''}
        onClose={d.closeSend}
        onSent={d.sent}
      />
      <Toast toast={d.toast} onClose={d.dismissToast} />
    </>
  );
}

/** `/invoices/:id` — an issued invoice. */
export default function InvoiceDetail() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <>
      <PageTitle
        title="Invoice"
        action={
          <Button component={RouterLink} to="/invoices" color="inherit">
            All invoices
          </Button>
        }
      />
      <VendorGate>{() => <Workspace invoiceId={id} />}</VendorGate>
    </>
  );
}
