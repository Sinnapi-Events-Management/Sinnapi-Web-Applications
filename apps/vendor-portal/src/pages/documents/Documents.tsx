import { Box, Button, PageTitle, Stack, StatusTabs } from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';
import VendorGate from '@/vendor/VendorGate';
import { LogoMissingBanner } from '@/components/businessLogo';
import { useDocuments } from './hooks/useDocuments';
import { TABS, type DocumentsTab } from './schema';
import DocumentsSummary from './components/organisms/DocumentsSummary';
import InvoicesPanel from './components/organisms/InvoicesPanel';
import ReceiptsPanel from './components/organisms/ReceiptsPanel';
import ContactsPanel from './components/organisms/ContactsPanel';

function NewDocButton(props: { to: string; label: string; hint: string; primary?: boolean }) {
  return (
    <Button
      component={RouterLink}
      to={props.to}
      variant={props.primary ? 'contained' : 'outlined'}
      sx={{ flex: 1, flexDirection: 'column', py: 1, lineHeight: 1.2, minWidth: 150 }}
    >
      <span>{props.label}</span>
      <Box component="span" sx={{ fontSize: '0.75rem', opacity: 0.85, fontWeight: 400 }}>
        {props.hint}
      </Box>
    </Button>
  );
}

export default function Documents() {
  const { tab, setTab } = useDocuments();

  return (
    <>
      <PageTitle
        title="Invoices & Receipts"
        subtitle="Bill your clients and confirm the payments you receive."
        action={
          // Each button says what it is for: vendors could not tell an invoice
          // (asking to be paid) from a receipt (proof they were paid).
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <NewDocButton to="/invoices/new" primary label="New invoice" hint="Ask to be paid" />
            <NewDocButton to="/receipts/new" label="New receipt" hint="Money you received" />
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
              ariaLabel="Invoices, receipts or my clients"
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
