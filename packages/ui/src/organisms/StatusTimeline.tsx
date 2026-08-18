'use client';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { StatusChip } from '../molecules/StatusChip';

/**
 * A step on a rendered status trail.
 *
 * `done` entries are drawn from real history rows and carry a timestamp; the
 * rest are projections of where the record is headed and carry none. Callers
 * build these from a `*_status_history` read plus a lifecycle projection — see
 * `remainingLifecycle` for bookings and `remainingQuotationLifecycle` for
 * quotations.
 */
export type StatusTimelineStep = {
  key: string;
  status: string;
  occurredAt: string | null;
  reason: string | null;
  done: boolean;
};

export type StatusTimelineProps = {
  steps: StatusTimelineStep[];
  /**
   * How to render a timestamp. Passed in rather than imported because each
   * portal owns its own date formatting, and a shared component reaching into
   * one app's config is how the three drift apart.
   */
  formatTimestamp: (value: string) => string;
  isLoading?: boolean;
  error?: unknown;
  /** Shown in place of the trail when the history read fails. */
  errorMessage?: string;
};

/**
 * What has happened to a record, and what is still expected.
 *
 * The trail is always secondary to the record it describes, so a failed read is
 * reported inside the component rather than raised to the page — the details
 * and actions beside it stay perfectly usable without it. That is also why the
 * loading and error states live here: every caller had reimplemented the same
 * three-skeleton block and the same apologetic sentence.
 */
export function StatusTimeline({
  steps,
  formatTimestamp,
  isLoading,
  error,
  errorMessage = 'The progress trail could not be loaded.',
}: StatusTimelineProps) {
  if (isLoading) {
    return (
      <Stack spacing={1.5}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={28} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="text.secondary">
        {errorMessage}
      </Typography>
    );
  }

  return (
    <Box>
      {steps.map((step, i) => (
        <TimelineRow
          key={step.key}
          step={step}
          isLast={i === steps.length - 1}
          formatTimestamp={formatTimestamp}
        />
      ))}
    </Box>
  );
}

/**
 * One row of the trail: the marker, what the record became, and when.
 * Projected steps render at reduced emphasis and say "Pending" where a
 * timestamp would be, so the eye can tell history from expectation without
 * reading the labels.
 */
function TimelineRow({
  step,
  isLast,
  formatTimestamp,
}: {
  step: StatusTimelineStep;
  isLast: boolean;
  formatTimestamp: (value: string) => string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ opacity: step.done ? 1 : 0.5 }}>
      <TimelineNode done={step.done} isLast={isLast} />
      <Box sx={{ minWidth: 0, pb: isLast ? 0 : 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <StatusChip status={step.status} />
          <Typography variant="caption" color="text.secondary">
            {step.occurredAt ? formatTimestamp(step.occurredAt) : 'Pending'}
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

/**
 * The dot-and-rail gutter of one row. The rail is drawn by the node above it
 * rather than between rows, which keeps the row itself a plain flex item and
 * lets rows of different heights line up without measurement.
 */
function TimelineNode({ done, isLast }: { done: boolean; isLast: boolean }) {
  return (
    <Stack alignItems="center" sx={{ alignSelf: 'stretch', width: 20, flexShrink: 0 }}>
      <Box
        sx={{
          width: 11,
          height: 11,
          mt: 0.6,
          borderRadius: '50%',
          border: '2px solid',
          borderColor: done ? 'secondary.main' : 'divider',
          bgcolor: done ? 'secondary.main' : 'transparent',
        }}
      />
      {!isLast && <Box sx={{ flex: 1, width: '2px', my: 0.5, bgcolor: 'divider' }} />}
    </Stack>
  );
}
