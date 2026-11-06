import { useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  PageTitle,
  Stack,
  Typography,
} from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import {
  DocumentStatusChip,
  ReceiptPreview,
  documentErrorMessage,
  formatDocumentMoney,
  toReceiptView,
} from '@sinnapi/ui/documents';
import { useClientReceipt } from '@/hooks/documentQueries';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';

/** `/receipts/:id` — a vendor's confirmation of a payment from this client. */
export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: row, isLoading, error } = useClientReceipt(id);
  const view = useMemo(() => (row ? toReceiptView(row) : null), [row]);
  const download = useDocumentDownload();

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
      {isLoading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error">
          {documentErrorMessage(error, 'This receipt could not be loaded.')}
        </Alert>
      )}
      {!isLoading && !error && (!row || !view) && (
        <EmptyState
          title="Receipt not found"
          ctaLabel="Back to receipts"
          ctaHref="/invoices?tab=receipts"
        />
      )}
      {row && view && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
          <Box sx={{ flex: '999 1 600px', minWidth: 0, order: { xs: 2, md: 1 } }}>
            <ReceiptPreview receipt={view} />
          </Box>
          <Card variant="outlined" sx={{ flex: '1 1 300px', minWidth: 0, order: { xs: 1, md: 2 } }}>
            <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
              <Stack spacing={1.5}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    {view.vendor.business_name}
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
                {row.status === 'void' && (
                  <Alert severity="warning">
                    The vendor cancelled this receipt
                    {row.void_reason ? `: ${row.void_reason}` : '.'}
                  </Alert>
                )}
                {row.invoice_id && (
                  <Button
                    component={RouterLink}
                    to={`/invoices/${row.invoice_id}`}
                    variant="outlined"
                  >
                    Open invoice {row.vendor_invoices?.document_no ?? ''}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => download.downloadReceipt(view)}
                  disabled={download.busy}
                >
                  {download.busy ? 'Preparing PDF…' : 'Download PDF'}
                </Button>
                {download.error && <Alert severity="error">{download.error}</Alert>}
                <Button component={RouterLink} to="/messages" variant="outlined">
                  Message {view.vendor.business_name}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
}
