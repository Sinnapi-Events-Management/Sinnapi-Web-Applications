'use client';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useNow } from '../data/useNow';
import {
  canNudgeSettlement,
  formatTimeLeft,
  settlementTurn,
  type SettlementRequestShape,
  type SettlementViewer,
} from './settlement';

export type SettlementDeadlineProps = {
  request: SettlementRequestShape;
  viewer: SettlementViewer;
  /** Omitted on a read-only surface; the reminder button is then not drawn. */
  onNudge?: () => void;
  isNudging?: boolean;
  /** Server-side cooldown, so the button and the RPC agree on when it reopens. */
  nudgeCooldownMinutes?: number;
};

/**
 * Whose turn it is, how long they have, and the one control that does anything
 * about it.
 *
 * A settlement is three people waiting on each other with a vendor's money in
 * the middle, and the failure mode is not disagreement — it is silence. So the
 * card never leaves the question "who are we waiting for" implicit, and it
 * gives whoever is watching a way to chase without leaving the page or
 * composing a message.
 *
 * The reminder is rate-limited server-side; the button reflects that rather
 * than letting someone press it into an error. Overdue is stated plainly and
 * in warning colour, because a clock that has run out and says nothing is how
 * a request sits for a day with everyone assuming somebody else has it.
 */
export function SettlementDeadline({
  request,
  viewer,
  onNudge,
  isNudging,
  nudgeCooldownMinutes = 60,
}: SettlementDeadlineProps) {
  const turn = settlementTurn(request, viewer);
  // Only tick while there is something to count down to.
  const now = useNow(60_000, !!turn.party);

  if (!turn.party) return null;

  const timeLeft = formatTimeLeft(turn.dueAt, now);
  const isOverdue = !!turn.dueAt && new Date(turn.dueAt).getTime() < now;
  const nudge = canNudgeSettlement(request, nudgeCooldownMinutes, now);

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Chip
        size="small"
        icon={<ScheduleIcon />}
        color={turn.isYours ? 'secondary' : isOverdue ? 'warning' : 'default'}
        variant={turn.isYours || isOverdue ? 'filled' : 'outlined'}
        label={turn.label}
      />

      {timeLeft && (
        <Typography variant="caption" color={isOverdue ? 'warning.main' : 'text.secondary'}>
          {timeLeft}
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      {/* Chasing yourself is not a feature. */}
      {onNudge && !turn.isYours && (
        <Button
          size="small"
          variant="text"
          startIcon={<NotificationsActiveIcon />}
          onClick={onNudge}
          disabled={isNudging || !nudge.allowed}
        >
          {nudge.allowed ? 'Send a reminder' : 'Reminder sent'}
        </Button>
      )}
    </Stack>
  );
}
