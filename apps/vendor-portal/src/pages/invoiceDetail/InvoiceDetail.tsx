import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, DetailTabPanel, DetailTabs } from '@sinnapi/ui';
import { BackButton, EmptyState, useBreadcrumbTitle, useUrlTab } from '@sinnapi/ui/router';
import { InvoicePreview, documentErrorMessage } from '@sinnapi/ui/documents';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VendorGate from '@/vendor/VendorGate';
import DeliveryHistory from '@/components/documents/organisms/DeliveryHistory';
import { useInvoiceDetail } from './hooks/useInvoiceDetail';
import InvoiceActionsCard from './components/organisms/InvoiceActionsCard';
import InvoiceReceiptsCard from './components/organisms/InvoiceReceiptsCard';
import InvoiceDialogs from './components/organisms/InvoiceDialogs';

const TABS = ['invoice', 'payments', 'emails'] as const;

/**
 * One issued invoice (redesigned 2026-11-17): the summary card with one main
 * action on top, then the invoice itself, its payments and its emails behind
 * three tabs — on a phone the document used to sit below six buttons and two
 * cards.
 */
function Workspace({ invoiceId }: { invoiceId: string }) {
  const d = useInvoiceDetail(invoiceId);
  const { tab, setTab } = useUrlTab(TABS);
  useBreadcrumbTitle(d.row?.recipient_name ? `Invoice for ${d.row.recipient_name}` : undefined);

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

  const payments = d.receipts.liveCount;
  return (
    <>
      <InvoiceActionsCard d={d} />
      <DetailTabs
        items={[
          {
            value: 'invoice',
            label: 'Invoice',
            icon: <ReceiptLongOutlinedIcon fontSize="small" />,
          },
          {
            value: 'payments',
            label: payments ? `Payments (${payments})` : 'Payments',
            icon: <PaymentsOutlinedIcon fontSize="small" />,
          },
          { value: 'emails', label: 'Emails', icon: <MailOutlineIcon fontSize="small" /> },
        ]}
        value={tab}
        onChange={setTab}
        idPrefix="invoice"
        ariaLabel="Invoice sections"
      />
      <DetailTabPanel value="invoice" active={tab} idPrefix="invoice">
        <InvoicePreview invoice={d.view} />
      </DetailTabPanel>
      <DetailTabPanel value="payments" active={tab} idPrefix="invoice">
        <InvoiceReceiptsCard d={d} />
      </DetailTabPanel>
      <DetailTabPanel value="emails" active={tab} idPrefix="invoice">
        <DeliveryHistory deliveries={d.deliveries} loading={d.deliveriesLoading} />
      </DetailTabPanel>
      <InvoiceDialogs d={d} />
    </>
  );
}

export default function InvoiceDetail() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/invoices" />
      </Box>
      <VendorGate>{() => <Workspace invoiceId={id} />}</VendorGate>
    </>
  );
}
