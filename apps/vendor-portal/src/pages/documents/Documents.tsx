import { Button, PageTitle, Stack, StatusTabs } from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';
import VendorGate from '@/vendor/VendorGate';
import { LogoMissingBanner } from '@/components/businessLogo';
import { useDocuments } from './hooks/useDocuments';
import { TABS, type DocumentsTab } from './schema';
import DocumentsSummary from './components/organisms/DocumentsSummary';
import InvoicesPanel from './components/organisms/InvoicesPanel';
import ReceiptsPanel from './components/organisms/ReceiptsPanel';
import ContactsPanel from './components/organisms/ContactsPanel';

export default function Documents() {
  const { tab, setTab } = useDocuments();

  return (
    <>
      <PageTitle
        title="Invoices & Receipts"
        subtitle="Bill your clients and confirm the payments you receive."
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button component={RouterLink} to="/receipts/new" variant="outlined">
              New receipt
            </Button>
            <Button component={RouterLink} to="/invoices/new" variant="contained">
              New invoice
            </Button>
          </Stack>
        }
      />
      <VendorGate>
        {(vendorId) => (
          <Stack spacing={2.5}>
            <LogoMissingBanner />
            <DocumentsSummary vendorId={vendorId} />
            <StatusTabs<DocumentsTab>
              options={TABS.map((t) => ({ value: t.value, label: t.label }))}
              value={tab}
              onChange={setTab}
              ariaLabel="Invoices, receipts or saved clients"
            />
            {tab === 'invoices' && <InvoicesPanel vendorId={vendorId} />}
            {tab === 'receipts' && <ReceiptsPanel vendorId={vendorId} />}
            {tab === 'clients' && <ContactsPanel vendorId={vendorId} />}
          </Stack>
        )}
      </VendorGate>
    </>
  );
}
