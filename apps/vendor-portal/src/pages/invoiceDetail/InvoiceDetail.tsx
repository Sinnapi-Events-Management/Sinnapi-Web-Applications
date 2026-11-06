import { useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, PageTitle, Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { InvoicePreview, documentErrorMessage } from '@sinnapi/ui/documents';
import VendorGate from '@/vendor/VendorGate';
import DeliveryHistory from '@/components/documents/organisms/DeliveryHistory';
import { useInvoiceDetail } from './hooks/useInvoiceDetail';
import InvoiceActionsCard from './components/organisms/InvoiceActionsCard';
import InvoiceReceiptsCard from './components/organisms/InvoiceReceiptsCard';
import InvoiceDialogs from './components/organisms/InvoiceDialogs';

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

  // Phone: summary and receipts first (what the vendor came to act on),
  // the paper below. Desktop: the paper leads, the panel sits beside it.
  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ flex: '999 1 600px', minWidth: 0, order: { xs: 2, md: 1 } }}>
          <InvoicePreview invoice={d.view} />
        </Box>
        <Stack spacing={2} sx={{ flex: '1 1 320px', minWidth: 0, order: { xs: 1, md: 2 } }}>
          <InvoiceActionsCard d={d} />
          <InvoiceReceiptsCard d={d} />
          <DeliveryHistory deliveries={d.deliveries} loading={d.deliveriesLoading} />
        </Stack>
      </Box>
      <InvoiceDialogs d={d} />
    </>
  );
}

/** `/invoices/:id` — an issued invoice, its receipts and what to do next. */
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
