import { Alert, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';
import ReceiptListItem from '../molecules/ReceiptListItem';

/**
 * Every receipt recorded against this invoice — the instalments — newest
 * first, each with its own preview / download / email actions. Booking
 * invoices are paid through Sinnapi and never have receipts, so the card
 * stays away for them.
 */
export default function InvoiceReceiptsCard({ d }: { d: InvoiceDetailApi }) {
  if (d.isBooking) return null;
  const list = d.receipts;
  const count = list.liveCount;

  return (
    <Card variant="outlined" component="section" aria-labelledby="invoice-receipts-title">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography
              id="invoice-receipts-title"
              variant="subtitle1"
              component="h2"
              fontWeight={700}
            >
              Receipts{count > 0 ? ` · ${count}` : ''}
            </Typography>
            {d.canRecordPayment && list.items.length > 0 && (
              <Button size="small" startIcon={<AddIcon />} onClick={d.openPayment}>
                Add
              </Button>
            )}
          </Stack>

          {list.loading && <Skeleton variant="rounded" height={64} />}
          {list.loadError && <Alert severity="error">{list.loadError}</Alert>}
          {list.downloadError && <Alert severity="error">{list.downloadError}</Alert>}

          {!list.loading && list.items.length === 0 && (
            <Stack alignItems="center" spacing={1} sx={{ py: 2, textAlign: 'center' }}>
              <ReceiptIcon color="disabled" />
              <Typography variant="body2" color="text.secondary">
                No payments yet. Record each payment as it comes in — clients can pay in parts.
              </Typography>
              {d.canRecordPayment && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={d.openPayment}
                >
                  Record payment
                </Button>
              )}
            </Stack>
          )}

          {list.items.length > 0 && (
            <Box component="ul" sx={{ m: 0, p: 0, display: 'grid', gap: 1 }}>
              {list.items.map((item) => (
                <ReceiptListItem
                  key={item.id}
                  item={item}
                  busy={list.downloadingId === item.id || list.emailingSelfId === item.id}
                  onPreview={() => list.openPreview(item)}
                  onDownload={() => list.download(item)}
                  onEmailClient={() => d.openSend(item.sendTarget)}
                  onEmailSelf={() => list.emailSelf(item)}
                  onOpen={() => d.openReceipt(item.id)}
                />
              ))}
            </Box>
          )}

          {list.voidCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              Cancelled receipts are kept for your records and do not count toward what was paid.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
