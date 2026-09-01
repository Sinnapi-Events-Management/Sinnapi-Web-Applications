import {
  Box,
  BudgetMeter,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  RequirementStateChip,
  Stack,
  Tooltip,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState, type MouseEvent } from 'react';
import type { EventRequirementModel } from '@/lib/types';

type Props = {
  row: EventRequirementModel;
  onEdit: (row: EventRequirementModel) => void;
  onCancel: (row: EventRequirementModel) => void;
  onRestore: (row: EventRequirementModel) => void;
  onDelete: (row: EventRequirementModel) => void;
};

/**
 * One budget line: what the client needs, what they set aside for it, and how
 * much of that is spoken for.
 *
 * TWO CHIPS, NOT ONE. The sourcing state ("No vendor yet") and the allocation
 * state ("over") answer different questions and can disagree — a line can be
 * booked and over, or open and unpriced. Merging them into one badge is how a
 * client reads a filled line as a problem.
 *
 * The meter is reused from the event budget rather than reimplemented, with the
 * line's allocation standing in for the budget. That is the whole reason
 * `BudgetFigures` is a shape rather than a model: a line IS a budget, just a
 * smaller one, and it overflows the same way.
 *
 * A line with no allocation draws no meter. There is no track to fill, and an
 * empty bar would say "nothing spent" where the truth is "nothing budgeted" —
 * so the line says that in words instead.
 */
export default function RequirementCard({ row, onEdit, onCancel, onRestore, onDelete }: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const isCancelled = Boolean(row.cancelled_at);
  const label = row.title ?? row.category_name;

  const openMenu = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const closeMenu = () => setAnchor(null);
  const run = (fn: () => void) => () => {
    closeMenu();
    fn();
  };

  // Deleting is only offered while nothing is attached. The RPC refuses
  // otherwise (`requirement_in_use`), and a menu item that exists to produce an
  // error is worse than one that is not there — so the menu asks the same
  // question the server does.
  const canDelete = row.quote_count === 0 && row.booking_count === 0;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        // A cancelled line stays legible but visibly out of the plan. Opacity
        // rather than a grey fill, which in dark mode reads as raised rather
        // than as withdrawn.
        opacity: isCancelled ? 0.6 : 1,
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 0 }}>
              {label}
            </Typography>
            {row.priority === 'nice_to_have' && (
              <Tooltip title="Trim this first if you need to get back under budget">
                <Chip size="small" variant="outlined" label="Nice to have" />
              </Tooltip>
            )}
          </Stack>

          {/* Only when the client gave the line their own label — otherwise
              this repeats the heading directly under itself. */}
          {row.title && (
            <Typography variant="caption" color="text.secondary">
              {row.category_name}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <RequirementStateChip state={row.state} />
          <IconButton
            size="small"
            onClick={openMenu}
            aria-label={`Actions for ${label}`}
            aria-haspopup="menu"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        {row.allocated_amount == null ? (
          <Typography variant="body2" color="text.secondary">
            No amount set aside
            {row.spoken_for > 0 && ` · ${formatAmount(row.spoken_for, row.currency)} spoken for`}
          </Typography>
        ) : (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              spacing={1}
              sx={{ mb: 0.75 }}
            >
              <Typography variant="body2" color="text.secondary" noWrap>
                {formatAmount(row.spoken_for, row.currency)} of{' '}
                {formatAmount(row.allocated_amount, row.currency)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: row.allocation_state === 'exceeded' ? 'error.main' : 'text.secondary',
                  flexShrink: 0,
                }}
              >
                {row.allocation_state === 'exceeded'
                  ? `${formatAmount(Math.abs(row.remaining_amount ?? 0), row.currency)} over`
                  : `${formatAmount(row.remaining_amount, row.currency)} left`}
              </Typography>
            </Stack>

            <BudgetMeter
              compact
              figures={{
                currency: row.currency,
                budget_amount: row.allocated_amount,
                committed_amount: row.committed_amount,
                pending_amount: row.pending_amount,
                spoken_for: row.spoken_for,
                remaining_amount: row.remaining_amount,
                usage_percent: row.usage_percent,
                state: row.allocation_state,
              }}
            />
          </>
        )}
      </Box>

      {/* What is actually happening on this line, as a sentence rather than as
          counters — "2 quotes" beside "1 vendor" invites the reader to work out
          whether those are the same thing. */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
        {describeEngagement(row)}
      </Typography>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        <MenuItem onClick={run(() => onEdit(row))}>Edit</MenuItem>
        {isCancelled ? (
          <MenuItem onClick={run(() => onRestore(row))}>Put back in the plan</MenuItem>
        ) : (
          <MenuItem onClick={run(() => onCancel(row))}>We don&apos;t need this</MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={run(() => onDelete(row))} sx={{ color: 'error.main' }}>
            Delete
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

/** One sentence about who is in the running for this line. */
function describeEngagement(row: EventRequirementModel): string {
  if (row.cancelled_at) return 'You marked this as no longer needed.';
  if (row.booking_count > 0) {
    return row.booking_count === 1
      ? '1 booking on this line.'
      : `${row.booking_count} bookings on this line.`;
  }
  if (row.quote_count > 0) {
    return row.quote_count === 1
      ? '1 quote in progress.'
      : `${row.quote_count} quotes in progress.`;
  }
  if (row.interest_count > 0) {
    return row.interest_count === 1
      ? '1 vendor could cover this.'
      : `${row.interest_count} vendors could cover this.`;
  }
  return 'Nobody lined up yet.';
}
