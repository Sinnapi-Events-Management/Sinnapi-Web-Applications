import { Box, ConfirmDialog, Stack, Toast } from '@sinnapi/ui';
import {
  InvoicePreview,
  formatDocumentMoney,
  type ContactRow,
  type InvoiceRow,
} from '@sinnapi/ui/documents';
import type { VendorClientModel } from '@/lib/types';
import type { useVendorBusinessCard } from '@/hooks/documentQueries';
import PreviewDialog from '@/components/documents/organisms/PreviewDialog';
import { useInvoiceForm } from '../../hooks/useInvoiceForm';
import RecipientSection from './RecipientSection';
import ItemsSection from './ItemsSection';
import TermsSection from './TermsSection';
import NotesSection from './NotesSection';
import SummaryAside from './SummaryAside';
import MobileActionBar from './MobileActionBar';

type Props = {
  row: InvoiceRow | null;
  clients: VendorClientModel[];
  contacts: ContactRow[];
  card: ReturnType<typeof useVendorBusinessCard>['data'];
};

/** The editor's two columns — form and summary — and its dialogs. */
export default function InvoiceEditorForm(props: Props) {
  const f = useInvoiceForm(props);

  return (
    <>
      <Box component="form" noValidate onSubmit={f.saveDraft}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
          <Stack spacing={2.25} sx={{ flex: '999 1 560px', minWidth: 0 }}>
            <RecipientSection f={f} />
            <ItemsSection f={f} />
            <TermsSection f={f} />
            <NotesSection f={f} />
          </Stack>
          <Box sx={{ flex: '1 1 320px', minWidth: 0, alignSelf: { md: 'stretch' } }}>
            <SummaryAside f={f} />
          </Box>
        </Box>
        <MobileActionBar f={f} />
      </Box>

      <PreviewDialog open={f.previewOpen} title="Preview" onClose={f.closePreview}>
        <InvoicePreview invoice={f.preview} />
      </PreviewDialog>

      <ConfirmDialog
        open={f.confirmIssue}
        title="Issue this invoice?"
        description={`It will be numbered for ${formatDocumentMoney(f.preview.total, f.preview.currency)} and can no longer be edited. To change it later, you void it and issue a new one.`}
        confirmLabel="Issue invoice"
        loading={f.busy}
        onConfirm={f.doIssue}
        onCancel={f.cancelIssue}
      />
      <ConfirmDialog
        open={f.confirmDelete}
        title="Delete this draft?"
        description="It has not been issued, so nothing has been sent to anyone."
        confirmLabel="Delete draft"
        destructive
        loading={f.deleting}
        onConfirm={f.doDelete}
        onCancel={f.cancelDelete}
      />
      <Toast toast={f.toast} onClose={f.dismissToast} />
    </>
  );
}
