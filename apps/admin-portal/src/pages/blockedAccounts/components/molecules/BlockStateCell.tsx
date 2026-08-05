import { Chip, Stack, Tooltip, Typography } from '@sinnapi/ui';
import LockClockIcon from '@mui/icons-material/LockClock';
import BlockIcon from '@mui/icons-material/Block';
import { formatDateTime } from '@/lib/config';
import { lockLabel, lockState } from '../../schema/presenter';
import type { BlockedAccountModel } from '@/lib/types';

/**
 * Why the account is blocked, and — for a lockout — how much longer.
 *
 * The countdown is the useful half. A lockout lifts by itself, so an admin
 * needs to distinguish one with twelve minutes to run from one that expired
 * while the page sat open; without it, every row looks equally urgent and locks
 * get cleared that would have cleared themselves.
 */
export default function BlockStateCell({ row }: { row: BlockedAccountModel }) {
  if (row.kind === 'suspended') {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <BlockIcon fontSize="small" color="error" />
        <Stack>
          <Typography variant="body2" fontWeight={600}>
            Suspended
          </Typography>
          <Typography variant="caption" color="text.secondary">
            By an administrator
          </Typography>
        </Stack>
      </Stack>
    );
  }

  const state = lockState(row);

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <LockClockIcon fontSize="small" color={state.active ? 'warning' : 'disabled'} />
      <Stack alignItems="flex-start">
        <Typography variant="body2" fontWeight={600}>
          Locked out
        </Typography>
        <Tooltip
          title={
            row.locked_until
              ? `Lifts automatically at ${formatDateTime(row.locked_until)}`
              : 'No expiry recorded'
          }
        >
          <Chip
            size="small"
            variant={state.active ? 'filled' : 'outlined'}
            color={state.active ? 'warning' : 'default'}
            label={lockLabel(state)}
            sx={{ height: 18, fontSize: 11 }}
          />
        </Tooltip>
      </Stack>
    </Stack>
  );
}
