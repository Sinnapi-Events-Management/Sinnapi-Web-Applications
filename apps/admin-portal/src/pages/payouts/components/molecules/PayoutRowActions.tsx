import { Button, Stack, Tooltip } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useAdmin } from '@/admin/AdminProvider';
import type { PayoutModel } from '@/lib/types';

type Props = {
  payout: PayoutModel;
  has: (permission: string) => boolean;
  busy: string | null;
  approve: (id: string) => void;
  approveSettlement: (id: string) => void;
  openSettlement: (payout: PayoutModel) => void;
};

/**
 * What a Finance admin can do to one payout, given its state and their own
 * permissions.
 *
 * The checker button is disabled — not hidden — for the person who recorded
 * the settlement, with the reason on hover. Hiding it would read as a missing
 * permission; the point is that the control is working.
 */
export default function PayoutRowActions({
  payout: p,
  has,
  busy,
  approve,
  approveSettlement,
  openSettlement,
}: Props) {
  const { profileId } = useAdmin();
  const isBusy = busy === p.id;
  const isRecorder = !!p.recorded_by && p.recorded_by === profileId;

  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end">
      {has('payout.approve') && p.status === 'requested' && !p.blocked_reason && (
        <Button size="small" variant="text" disabled={isBusy} onClick={() => approve(p.id)}>
          Approve
        </Button>
      )}

      {has('payout.settle') &&
        ['requested', 'approved'].includes(p.status) &&
        !p.blocked_reason && (
          <Button
            size="small"
            variant="contained"
            startIcon={<ReceiptLongIcon />}
            disabled={isBusy}
            onClick={() => openSettlement(p)}
          >
            Record settlement
          </Button>
        )}

      {has('payout.settle.approve') && p.status === 'settlement_recorded' && (
        <Tooltip
          title={
            isRecorder
              ? 'You recorded this settlement — a different Finance admin must approve it.'
              : 'Closes the ledger and notifies the vendor.'
          }
        >
          {/* Span so the tooltip still fires on a disabled button. */}
          <span>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<DoneAllIcon />}
              disabled={isBusy || isRecorder}
              onClick={() => approveSettlement(p.id)}
            >
              Approve settlement
            </Button>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
}
