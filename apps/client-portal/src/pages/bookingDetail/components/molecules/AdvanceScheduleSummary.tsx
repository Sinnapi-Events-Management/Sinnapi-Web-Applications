import { Box, Stack, Typography } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';

type Props = {
  advanceRate: number | null;
  advanceAmount: number | null;
  balanceAmount: number | null;
  daysBefore: number | null;
  releaseDueAt: string | null;
  currency: string | null;
};

/**
 * The chosen schedule as a sentence: how much leaves early, when, and what
 * stays protected.
 *
 * Money first and the percentage second — "UGX 600,000 on 9 September" is
 * what the client is actually agreeing to; "30%" is the arithmetic behind it.
 */
export default function AdvanceScheduleSummary({
  advanceRate,
  advanceAmount,
  balanceAmount,
  daysBefore,
  releaseDueAt,
  currency,
}: Props) {
  const due = releaseDueAt ? new Date(releaseDueAt) : null;
  const dueLabel =
    due && !Number.isNaN(due.getTime())
      ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

  // Zero is a real choice, not an empty state, and it deserves its own
  // sentence: the alternative reads as "UGX 0 goes to your vendor", which
  // states a non-event as if it were part of the schedule.
  if (advanceRate != null && advanceRate <= 0) {
    return (
      <Typography variant="body2">
        Nothing is released before your event. The full{' '}
        <Box component="span" fontWeight={700}>
          {formatMoney(balanceAmount, currency)}
        </Box>{' '}
        stays protected by Sinnapi until you confirm the service was delivered.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Typography variant="body2">
        <Box component="span" fontWeight={700}>
          {formatMoney(advanceAmount, currency)}
        </Box>{' '}
        {advanceRate ? `(${Number(advanceRate)}% advance)` : 'advance'} goes to your vendor
        {dueLabel ? (
          <>
            {' '}
            on{' '}
            <Box component="span" fontWeight={700}>
              {dueLabel}
            </Box>
          </>
        ) : null}
        {daysBefore != null && daysBefore > 0 ? `, ${daysBefore} days before your event.` : '.'}
      </Typography>

      <Typography variant="body2">
        The remaining{' '}
        <Box component="span" fontWeight={700}>
          {formatMoney(balanceAmount, currency)}
        </Box>{' '}
        stays protected by Sinnapi until you confirm the service was delivered.
      </Typography>
    </Stack>
  );
}
