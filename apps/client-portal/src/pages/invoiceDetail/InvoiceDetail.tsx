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
  InvoicePreview,
  documentErrorMessage,
  formatDocumentDate,
  balanceLine,
  invoiceDisplayStatus,
  toAmount,
  toInvoiceView,
} from '@sinnapi/ui/documents';
import { useClientInvoice } from '@/hooks/documentQueries';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';

/**
 * `/invoices/:id` — an invoice a vendor sent this client.
 *
 * A booking invoice is paid through Sinnapi, so it links to the booking's
 * checkout. Any other invoice is paid to the vendor directly, following the
 * instructions printed on it; the vendor then confirms it with a receipt.
 */
export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: row, isLoading, error } = useClientInvoice(id);
  const view = useMemo(() => (row ? toInvoiceView(row) : null), [row]);
  const download = useDocumentDownload();
  const owed = balanceLine(toAmount(row?.balance_due), row?.currency ?? 'UGX');
  // Paid or overpaid: nothing left to pay.
  const settled = row?.status === 'paid' || row?.status === 'overpaid';

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
      {isLoading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error">
          {documentErrorMessage(error, 'This invoice could not be loaded.')}
        </Alert>
      )}
      {!isLoading && !error && (!row || !view) && (
        <EmptyState title="Invoice not found" ctaLabel="Back to invoices" ctaHref="/invoices" />
      )}
      {row && view && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
          <Box sx={{ flex: '999 1 600px', minWidth: 0, order: { xs: 2, md: 1 } }}>
            <InvoicePreview invoice={view} />
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
                  <DocumentStatusChip
                    kind="invoice"
                    status={invoiceDisplayStatus(row.status, row.due_date)}
                  />
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.document_no} · due {formatDocumentDate(row.due_date)}
                </Typography>
                {row.status !== 'void' && (
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography fontWeight={700}>
                      {owed.overpaid ? 'You overpaid by' : 'You owe'}
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={700}
                      sx={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {owed.value}
                    </Typography>
                  </Stack>
                )}
                {owed.overpaid && row.status !== 'void' && (
                  <Alert severity="info">
                    You have paid more than this invoice. Message {view.vendor.business_name} to
                    arrange a refund or credit.
                  </Alert>
                )}
                {row.status === 'void' && (
                  <Alert severity="warning">This invoice was cancelled by the vendor.</Alert>
                )}
                {row.payment_channel === 'sinnapi_escrow' &&
                  row.booking_id &&
                  row.status !== 'void' &&
                  (settled ? (
                    <Alert severity="success">Paid through Sinnapi.</Alert>
                  ) : (
                    <Button
                      component={RouterLink}
                      to={`/bookings/${row.booking_id}`}
                      variant="contained"
                    >
                      Pay through Sinnapi
                    </Button>
                  ))}
                {row.payment_channel === 'vendor_collected' &&
                  row.status !== 'void' &&
                  !settled && (
                    <Typography variant="body2" color="text.secondary">
                      Pay {view.vendor.business_name} directly using the instructions on the
                      invoice. They confirm your payment with a receipt, which appears in Receipts.
                    </Typography>
                  )}
                <Button
                  variant="outlined"
                  onClick={() => download.downloadInvoice(view)}
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
