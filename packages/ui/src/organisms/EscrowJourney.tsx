'use client';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatAmount } from '../molecules/money';

/** Escrow states in the order money actually travels through them. */
const ORDER = [
  'initiated',
  'awaiting_advance',
  'held',
  'advance_released',
  'release_requested',
  'payout_approved',
  'paid_out',
] as const;

type StepKey = 'funded' | 'advance' | 'confirmed' | 'settled';

type Step = {
  key: StepKey;
  label: string;
  /** What this step means for the money, in the reader's own terms. */
  caption: (ctx: EscrowJourneyProps) => string;
};

/**
 * Four steps, not seven. The database tracks every transition it needs for
 * audit; a client wants to know whether their money is safe, on its way, or
 * done. Collapsing the admin-side states into the step they belong to keeps
 * the answer to one glance.
 */
const STEPS: Step[] = [
  {
    key: 'funded',
    label: 'Funds secured',
    caption: (p) => `${formatAmount(p.grossAmount, p.currency)} held by Sinnapi`,
  },
  {
    key: 'advance',
    label: 'Advance released',
    caption: (p) =>
      p.advanceAmount
        ? `${formatAmount(p.advanceAmount, p.currency)} to the vendor`
        : 'No advance agreed',
  },
  {
    key: 'confirmed',
    label: 'Service confirmed',
    caption: () => 'You approve the work was delivered',
  },
  {
    key: 'settled',
    label: 'Balance paid',
    caption: (p) => `${formatAmount(p.balanceAmount, p.currency)} to the vendor`,
  },
];

/** How far through the four steps a given escrow status has reached. */
function reached(status: string): number {
  switch (status) {
    case 'initiated':
    case 'failed':
      return 0;
    case 'awaiting_advance':
    case 'held':
      return 1;
    case 'advance_released':
      return 2;
    case 'release_requested':
    case 'admin_review':
      return 3;
    case 'payout_approved':
    case 'paid_out':
      return 4;
    default:
      // disputed / refunded / partially_refunded are off the happy path and
      // are rendered by the banner rather than by advancing the track.
      return ORDER.indexOf(status as (typeof ORDER)[number]) >= 0 ? 1 : 0;
  }
}

export type EscrowJourneyProps = {
  status: string;
  currency?: string;
  grossAmount?: number | string | null;
  advanceAmount?: number | string | null;
  balanceAmount?: number | string | null;
  /** When the advance becomes payable, if it has not yet. */
  advanceDueAt?: string | null;
  /** Deadline for the client to confirm before it goes to review. */
  autoReleaseAt?: string | null;
  /** Compact single-row rendering for list views. */
  dense?: boolean;
};

/**
 * The escrow journey as a progress track.
 *
 * Opaque fund state is what erodes trust in escrow — the whole point of
 * holding someone's money is that they can see it is being held. Every step
 * therefore names the amount attached to it, not just its own status.
 */
export function EscrowJourney(props: EscrowJourneyProps) {
  const { status, dense } = props;
  const done = reached(status);
  const isDisputed = status === 'disputed';
  const isRefunded = status === 'refunded' || status === 'partially_refunded';
  const isFailed = status === 'failed';
  const halted = isDisputed || isRefunded || isFailed;

  return (
    <Stack spacing={dense ? 1 : 2}>
      {halted && (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            p: 1.25,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.error.main, 0.08),
            border: (t) => `1px solid ${alpha(t.palette.error.main, 0.24)}`,
          }}
        >
          <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
          <Typography variant="body2" color="error.main" fontWeight={600}>
            {isDisputed && 'Funds are frozen while an issue is reviewed'}
            {isRefunded && 'This escrow has been refunded'}
            {isFailed && 'Funding did not complete'}
          </Typography>
        </Stack>
      )}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={0}
        sx={{ opacity: halted ? 0.55 : 1 }}
      >
        {STEPS.map((step, i) => {
          const complete = i < done;
          const current = i === done && !halted;

          return (
            <Stack
              key={step.key}
              direction={{ xs: 'row', sm: 'column' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={{ xs: 1.5, sm: 0 }}
              sx={{ flex: 1, minWidth: 0, position: 'relative' }}
            >
              {/* Connector to the previous step. Hidden on the first, and on
                  xs where the layout stacks and the rail reads vertically. */}
              {i > 0 && (
                <Box
                  aria-hidden
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    position: 'absolute',
                    top: 11,
                    right: '50%',
                    width: '100%',
                    height: 2,
                    bgcolor: (t) =>
                      complete ? t.palette.success.main : alpha(t.palette.divider, 0.9),
                  }}
                />
              )}

              <Box sx={{ position: 'relative', zIndex: 1, lineHeight: 0, py: { xs: 0.25, sm: 0 } }}>
                {complete ? (
                  <CheckCircleIcon sx={{ fontSize: 24, color: 'success.main' }} />
                ) : current ? (
                  <Tooltip title="In progress">
                    <ScheduleIcon sx={{ fontSize: 24, color: 'secondary.main' }} />
                  </Tooltip>
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 24, color: 'text.disabled' }} />
                )}
              </Box>

              <Box
                sx={{
                  textAlign: { xs: 'left', sm: 'center' },
                  mt: { xs: 0, sm: 1 },
                  px: { sm: 0.5 },
                  minWidth: 0,
                  pb: { xs: 1.5, sm: 0 },
                }}
              >
                <Typography
                  variant="body2"
                  fontWeight={current || complete ? 700 : 500}
                  color={current || complete ? 'text.primary' : 'text.secondary'}
                >
                  {step.label}
                </Typography>
                {!dense && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {step.caption(props)}
                  </Typography>
                )}
              </Box>
            </Stack>
          );
        })}
      </Stack>

      {!dense && !halted && <NextMilestone {...props} done={done} />}
    </Stack>
  );
}

/** The one date that matters right now, stated plainly. */
function NextMilestone({
  done,
  advanceDueAt,
  autoReleaseAt,
}: EscrowJourneyProps & { done: number }) {
  const when = done <= 1 ? advanceDueAt : done === 2 ? autoReleaseAt : null;
  if (!when) return null;

  const date = new Date(when);
  if (Number.isNaN(date.getTime())) return null;

  const label =
    done <= 1
      ? 'Advance releases to the vendor on'
      : 'Confirm by this date or it goes to our team for review:';

  return (
    <Typography variant="caption" color="text.secondary">
      {label}{' '}
      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Box>
    </Typography>
  );
}
