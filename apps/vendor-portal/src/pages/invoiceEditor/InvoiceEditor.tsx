import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, PageTitle } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { documentErrorMessage } from '@sinnapi/ui/documents';
import VendorGate from '@/vendor/VendorGate';
import { useInvoiceEditor } from './hooks/useInvoiceEditor';
import InvoiceEditorForm from './components/organisms/InvoiceEditorForm';

function Workspace({ vendorId, invoiceId }: { vendorId: string; invoiceId: string | undefined }) {
  const e = useInvoiceEditor(vendorId, invoiceId);

  if (e.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (e.error)
    return (
      <Alert severity="error">
        {documentErrorMessage(e.error, 'This invoice could not be loaded.')}
      </Alert>
    );
  if (e.notFound) {
    return (
      <EmptyState
        title="Invoice not found"
        description="It may have been deleted."
        ctaLabel="Back to invoices"
        ctaHref="/invoices"
      />
    );
  }
  // An issued invoice redirects to its page; render nothing while that happens.
  if (invoiceId && !e.row) return null;

  return (
    <InvoiceEditorForm
      key={e.row?.id ?? 'new'}
      row={e.row}
      clients={e.clients}
      contacts={e.contacts}
      card={e.card}
    />
  );
}

/** `/invoices/new` and `/invoices/:id/edit` — creating and editing a draft. */
export default function InvoiceEditor() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <PageTitle
        title={id ? 'Edit draft invoice' : 'New invoice'}
        subtitle="Drafts have no number. The number is given when you issue it."
      />
      <VendorGate>{(vendorId) => <Workspace vendorId={vendorId} invoiceId={id} />}</VendorGate>
    </>
  );
}
