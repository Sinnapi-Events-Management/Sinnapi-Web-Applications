import { Alert, Button, Card, CardContent, Divider, Stack, Typography } from '@sinnapi/ui';
import {
  DocumentStatusChip,
  formatDocumentDate,
  formatDocumentMoney,
  toAmount,
} from '@sinnapi/ui/documents';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';

/**
 * Where the invoice stands and what to do next. Payment for a booking
 * invoice happens through Sinnapi, so it never offers "Record payment".
 */
export default function InvoiceActionsCard({ d }: { d: InvoiceDetailApi }) {
  const row = d.row!;
  return (
    <Card variant="outlined">
      <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
        <Stack spacing={1.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {row.document_no}
            </Typography>
            {d.display && <DocumentStatusChip kind="invoice" status={d.display} />}
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {row.recipient_name} · due {formatDocumentDate(row.due_date)}
            </Typography>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Total</Typography>
              <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDocumentMoney(row.total, row.currency)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography color="text.secondary">Paid</Typography>
              <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDocumentMoney(row.amount_paid, row.currency)}
              </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography fontWeight={700}>Still owed</Typography>
              <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDocumentMoney(
                  row.status === 'void' ? 0 : toAmount(row.balance_due),
                  row.currency,
                )}
              </Typography>
            </Stack>
          </Stack>

          {d.isBooking && row.status !== 'void' && (
            <Alert severity="info">
              {row.status === 'paid'
                ? 'Paid through Sinnapi escrow.'
                : 'Your client pays this booking through Sinnapi. It is marked paid as soon as they do.'}
            </Alert>
          )}
          {row.status === 'void' && row.void_reason && (
            <Alert severity="warning">Voided: {row.void_reason}</Alert>
          )}

          {d.downloadError && <Alert severity="error">{d.downloadError}</Alert>}

          <Stack spacing={1}>
            {d.canSend && (
              <Button variant="contained" onClick={d.openSend}>
                Email to client
              </Button>
            )}
            <Button variant="outlined" onClick={d.download} disabled={d.downloading}>
              {d.downloading ? 'Preparing PDF…' : 'Download PDF'}
            </Button>
            {d.canRecordPayment && (
              <Button variant="outlined" onClick={d.openPayment}>
                Record payment
              </Button>
            )}
            {d.canDuplicate && (
              <Button variant="outlined" onClick={d.copyToDraft} disabled={d.copying}>
                {d.copying ? 'Copying…' : 'Copy into a new draft'}
              </Button>
            )}
          </Stack>

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
                  Void invoice
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
