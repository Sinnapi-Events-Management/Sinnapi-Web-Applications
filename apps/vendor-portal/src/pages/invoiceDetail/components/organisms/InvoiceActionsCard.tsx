import { Alert, Button, Card, CardContent, Divider, Stack, Typography } from '@sinnapi/ui';
import { DocumentStatusChip, formatDocumentDate } from '@sinnapi/ui/documents';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';
import InvoiceMoneySummary from '../molecules/InvoiceMoneySummary';
import InvoiceActionButtons from '../molecules/InvoiceActionButtons';

/**
 * Where the invoice stands and what to do next. Payment for a booking
 * invoice happens through Sinnapi, so it never offers "Record payment".
 */
export default function InvoiceActionsCard({ d }: { d: InvoiceDetailApi }) {
  const row = d.row!;
  return (
    <Card variant="outlined" component="section" aria-label="Invoice summary">
      <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
        <Stack spacing={1.75}>
          <Stack spacing={0.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography
                variant="subtitle1"
                component="h2"
                fontWeight={700}
                sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
              >
                {row.document_no}
              </Typography>
              {d.display && <DocumentStatusChip kind="invoice" status={d.display} />}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {row.recipient_name} · due {formatDocumentDate(row.due_date)}
            </Typography>
          </Stack>

          <InvoiceMoneySummary d={d} />

          {d.isBooking && row.status !== 'void' && (
            <Alert severity="info">
              {row.status === 'paid'
                ? 'Paid through Sinnapi escrow.'
                : 'Your client pays this booking through Sinnapi. It is marked paid as soon as they do.'}
            </Alert>
          )}
          {row.status === 'void' && row.void_reason && (
            <Alert severity="warning">Cancelled: {row.void_reason}</Alert>
          )}
          {d.downloadError && <Alert severity="error">{d.downloadError}</Alert>}

          <InvoiceActionButtons d={d} />

          {(d.canVoid || d.voidBlockedReason) && (
            <>
              <Divider />
              {d.canVoid ? (
                <Button
                  color="error"
                  onClick={d.openVoid}
                  sx={{ alignSelf: 'flex-start' }}
                  size="small"
                >
                  Cancel invoice
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {d.voidBlockedReason}
                </Typography>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
