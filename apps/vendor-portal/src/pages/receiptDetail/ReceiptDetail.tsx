import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  PageTitle,
  Stack,
  Toast,
  Typography,
} from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import {
  DocumentStatusChip,
  ReceiptPreview,
  documentErrorMessage,
  formatDocumentMoney,
} from '@sinnapi/ui/documents';
import VendorGate from '@/vendor/VendorGate';
import VoidDialog from '@/components/documents/organisms/VoidDialog';
import DeliveryHistory from '@/components/documents/organisms/DeliveryHistory';
import SendDocumentDialog from '@/components/documents/organisms/SendDocumentDialog';
import { useReceiptDetail } from './hooks/useReceiptDetail';

function Workspace({ receiptId }: { receiptId: string }) {
  const d = useReceiptDetail(receiptId);

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
        {documentErrorMessage(d.error, 'This receipt could not be loaded.')}
      </Alert>
    );
  if (!d.row || !d.view) {
    return (
      <EmptyState
        title="Receipt not found"
        ctaLabel="Back to receipts"
        ctaHref="/invoices?tab=receipts"
      />
    );
  }
  const row = d.row;

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
        <Box sx={{ flex: '999 1 600px', minWidth: 0, order: { xs: 2, md: 1 } }}>
          <ReceiptPreview receipt={d.view} />
        </Box>
        <Stack spacing={2} sx={{ flex: '1 1 300px', minWidth: 0, order: { xs: 1, md: 2 } }}>
          <Card variant="outlined">
            <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {row.document_no}
                  </Typography>
                  <DocumentStatusChip kind="receipt" status={row.status} />
                </Stack>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatDocumentMoney(row.amount, row.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From {row.recipient_name}
                </Typography>
                {d.downloadError && <Alert severity="error">{d.downloadError}</Alert>}
                {row.status === 'issued' && (
                  <Button variant="contained" onClick={d.openSend}>
                    Email to client
                  </Button>
                )}
                {row.status === 'issued' && (
                  <Button variant="outlined" onClick={d.emailSelf} disabled={d.emailingSelf}>
                    {d.emailingSelf ? 'Sending…' : 'Email to myself'}
                  </Button>
                )}
                <Button variant="outlined" onClick={d.download} disabled={d.downloading}>
                  {d.downloading ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
                {row.invoice_id && (
                  <Button
                    component={RouterLink}
                    to={`/invoices/${row.invoice_id}`}
                    variant="outlined"
                  >
                    Open invoice {row.vendor_invoices?.document_no ?? ''}
                  </Button>
                )}
                {row.status === 'void' && row.void_reason && (
                  <Alert severity="warning">Voided: {row.void_reason}</Alert>
                )}
                {row.status === 'issued' && (
                  <>
                    <Divider />
                    <Button
                      color="error"
                      size="small"
                      onClick={d.openVoid}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Void receipt
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
          <DeliveryHistory deliveries={d.deliveries} loading={d.deliveriesLoading} />
        </Stack>
      </Box>

      <VoidDialog
        open={d.voidOpen}
        noun="receipt"
        documentNo={row.document_no}
        consequence={
          row.invoice_id
            ? 'The payment is taken off the invoice, which goes back to owing this amount. The receipt stays in your records, stamped VOID.'
            : 'The receipt stays in your records, stamped VOID.'
        }
        busy={d.voidBusy}
        error={d.voidError}
        onConfirm={d.confirmVoid}
        onClose={d.closeVoid}
      />
      <SendDocumentDialog
        open={d.sendOpen}
        target={d.sendTarget}
        documentNo={row.document_no}
        onClose={d.closeSend}
        onSent={d.sent}
      />
      <Toast toast={d.toast} onClose={d.dismissToast} />
    </>
  );
}

/** `/receipts/:id` — one payment receipt. */
export default function ReceiptDetail() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <>
      <PageTitle
        title="Receipt"
        action={
          <Button component={RouterLink} to="/invoices?tab=receipts" color="inherit">
            All receipts
          </Button>
        }
      />
      <VendorGate>{() => <Workspace receiptId={id} />}</VendorGate>
    </>
  );
}
