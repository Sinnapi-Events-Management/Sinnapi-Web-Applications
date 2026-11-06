import { Card, CardActionArea, CardContent, Skeleton, Stack, Typography } from '@sinnapi/ui';
import {
  DocumentStatusChip,
  RECEIPT_METHOD_LABELS,
  formatDocumentDate,
  formatDocumentMoney,
} from '@sinnapi/ui/documents';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';

/** The receipts recorded against this invoice; each opens its own page. */
export default function PaymentsCard({ d }: { d: InvoiceDetailApi }) {
  if (d.isBooking) return null;
  return (
    <Card variant="outlined">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" component="h2" fontWeight={700}>
            Payments
          </Typography>
          {d.receiptsLoading && <Skeleton variant="rounded" height={48} />}
          {!d.receiptsLoading && d.receipts.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No payments recorded yet.
            </Typography>
          )}
          {d.receipts.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardActionArea onClick={() => d.openReceipt(r.id)} sx={{ px: 1.5, py: 1.25 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                  alignItems="center"
                >
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatDocumentMoney(r.amount, r.currency)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {r.document_no} · {formatDocumentDate(r.payment_date)} ·{' '}
                      {RECEIPT_METHOD_LABELS[r.payment_method]}
                    </Typography>
                  </Stack>
                  <DocumentStatusChip kind="receipt" status={r.status} />
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
