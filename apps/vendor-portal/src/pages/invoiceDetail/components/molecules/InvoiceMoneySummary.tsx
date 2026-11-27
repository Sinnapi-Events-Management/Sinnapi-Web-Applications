import { Stack } from '@sinnapi/ui';
import { balanceLine, formatDocumentMoney, toAmount } from '@sinnapi/ui/documents';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';
import MoneyLine from '../atoms/MoneyLine';
import PaymentProgress from './PaymentProgress';

/**
 * Total → paid → what is left, or "Overpaid by". The progress bar and its
 * flag show only for invoices the vendor collects themselves; a booking
 * invoice is paid in one go through Sinnapi.
 */
export default function InvoiceMoneySummary({ d }: { d: InvoiceDetailApi }) {
  const row = d.row!;
  const isVoid = row.status === 'void';
  const balance = balanceLine(isVoid ? 0 : toAmount(row.balance_due), row.currency, 'Still owed');

  let tone: 'default' | 'warning' | 'success' = 'default';
  if (balance.overpaid) tone = 'warning';
  else if (!isVoid && toAmount(row.balance_due) === 0) tone = 'success';

  return (
    <Stack spacing={1.25}>
      <Stack spacing={0.5}>
        <MoneyLine label="Total" value={formatDocumentMoney(row.total, row.currency)} />
        <MoneyLine label="Paid" value={formatDocumentMoney(row.amount_paid, row.currency)} />
        <MoneyLine label={balance.label} value={balance.value} strong tone={tone} />
      </Stack>
      {!d.isBooking && !isVoid && d.coverage && (
        <PaymentProgress
          coverage={d.coverage}
          currency={row.currency}
          receiptCount={d.receipts.liveCount}
        />
      )}
    </Stack>
  );
}
