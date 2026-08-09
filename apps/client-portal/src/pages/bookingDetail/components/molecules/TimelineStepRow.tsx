import { Box, Stack, Typography, StatusChip } from '@sinnapi/ui';
import { formatDateTime } from '@/lib/config';
import TimelineNode from '../atoms/TimelineNode';
import type { TimelineStep } from '../../hooks/useBookingTimeline';

type Props = {
  step: TimelineStep;
  isLast: boolean;
};

/**
 * One row of the status trail: the marker, what the booking became, and when.
 * Projected steps render at reduced emphasis and say "Pending" where a
 * timestamp would be, so the eye can tell history from expectation without
 * reading the labels.
 */
export default function TimelineStepRow({ step, isLast }: Props) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ opacity: step.done ? 1 : 0.5 }}>
      <TimelineNode done={step.done} isLast={isLast} />
      <Box sx={{ minWidth: 0, pb: isLast ? 0 : 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <StatusChip status={step.status} />
          <Typography variant="caption" color="text.secondary">
            {step.occurredAt ? formatDateTime(step.occurredAt) : 'Pending'}
          </Typography>
        </Stack>
        {step.reason && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {step.reason}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
