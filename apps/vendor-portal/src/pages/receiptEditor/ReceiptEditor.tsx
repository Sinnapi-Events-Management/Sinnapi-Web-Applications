import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, CircularProgress, PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { useVendorClients } from '@/hooks/queries';
import { useVendorContacts } from '@/hooks/documentQueries';
import ReceiptForm from '@/components/documents/organisms/ReceiptForm';

function Workspace({ vendorId }: { vendorId: string }) {
  const navigate = useNavigate();
  const clients = useVendorClients();
  const contacts = useVendorContacts(vendorId);

  if (clients.isLoading || contacts.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card variant="outlined" sx={{ maxWidth: 760 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <ReceiptForm
          linked={null}
          clients={clients.data ?? []}
          contacts={contacts.data ?? []}
          onCancel={() => navigate('/invoices?tab=receipts')}
          onDone={(r) =>
            navigate(`/receipts/${r.id}`, {
              replace: true,
              state: { notice: `Receipt ${r.documentNo} created` },
            })
          }
        />
      </CardContent>
    </Card>
  );
}

/**
 * `/receipts/new` — a receipt on its own, for a payment that has no invoice
 * on Sinnapi. Payments against an invoice are recorded from the invoice.
 */
export default function ReceiptEditor() {
  return (
    <>
      <PageTitle
        title="New receipt"
        subtitle="Confirm a payment you received. For a payment against one of your invoices, record it from the invoice instead."
      />
      <VendorGate>{(vendorId) => <Workspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}
