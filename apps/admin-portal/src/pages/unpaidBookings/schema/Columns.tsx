import {
  PaymentWindowChip,
  Typography,
  type DataTableColumn,
  type PaymentChaseAction,
} from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { UnpaidBookingModel } from '@/lib/types';
import PaymentAttemptCell from '../components/molecules/PaymentAttemptCell';
import UnpaidRowActions from '../components/molecules/UnpaidRowActions';

type Options = {
  onChase: (action: PaymentChaseAction, booking: UnpaidBookingModel) => void;
  busy: boolean;
};

/**
 * Columns for the unpaid queue.
 *
 * Ordered by the question an operator asks in sequence: which booking, whose,
 * how much is at stake, when the event is, how long they have had, whether
 * they have tried, and then what to do. The two columns that make this page
 * worth having over the bookings list are the last two before the actions —
 * without them the queue is just a filtered table.
 *
 * A factory rather than a constant because the row actions need the page's
 * chase handler, which belongs to the hook.
 */
export function unpaidBookingColumns({
  onChase,
  busy,
}: Options): DataTableColumn<UnpaidBookingModel>[] {
  return [
    {
      field: 'reference_no',
      headerName: 'Reference',
      sortable: true,
      render: (b) => <Typography variant="body2">{b.reference_no ?? '—'}</Typography>,
    },
    {
      field: 'client_name',
      headerName: 'Client',
      render: (b) => (
        <Typography variant="body2" noWrap>
          {b.client_name}
        </Typography>
      ),
    },
    {
      field: 'vendor_name',
      headerName: 'Vendor',
      render: (b) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {b.vendor_name}
        </Typography>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      align: 'right',
      sortable: true,
      render: (b) => formatMoney(b.amount, b.currency),
    },
    {
      field: 'event_date',
      headerName: 'Event',
      sortable: true,
      render: (b) => formatDate(b.event_date),
    },
    {
      field: 'effective_due_at',
      headerName: 'Payment due',
      sortable: true,
      // The deadline in force, resolved server-side so an extended booking
      // sorts by the date it is actually counting down to rather than the one
      // it was originally given.
      render: (b) => (
        <PaymentWindowChip
          booking={{
            status: b.status,
            payment_type: 'escrow',
            payment_due_at: b.payment_due_at,
            payment_due_override_at: b.payment_due_override_at,
            payment_overdue_at: b.payment_overdue_at,
            payment_settled_at: null,
          }}
          audience="admin"
        />
      ),
    },
    {
      field: 'escrow_status',
      headerName: 'Attempt',
      render: (b) => <PaymentAttemptCell booking={b} />,
    },
    {
      field: 'payment_nudge_count',
      headerName: 'Chased',
      align: 'right',
      // Shown so an operator can see at a glance whether this client has
      // already been chased four times — at which point sending a fifth
      // reminder is not the next useful action, and the cancel button is.
      render: (b) => (
        <Typography
          variant="body2"
          color={b.payment_nudge_count ? 'text.primary' : 'text.disabled'}
        >
          {b.payment_nudge_count ? `${b.payment_nudge_count}×` : '—'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      align: 'right',
      render: (b) => <UnpaidRowActions booking={b} onSelect={onChase} disabled={busy} />,
    },
  ];
}
