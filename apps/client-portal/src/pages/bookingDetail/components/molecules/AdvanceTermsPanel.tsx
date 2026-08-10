import { Box, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import { formatMoney } from '@/lib/config';

type Props = {
  advanceRate: number | null;
  advanceAmount: number | null;
  balanceAmount: number | null;
  daysBefore: number | null;
  releaseDueAt: string | null;
  currency: string | null;
  note: string | null;
};

/**
 * The payment schedule the vendor proposed, in the client's terms.
 *
 * The client is being asked to consent to money leaving before the event
 * happens, so the panel leads with when that is and how much — not with the
 * percentage, which is the vendor's framing rather than theirs.
 */
export default function AdvanceTermsPanel({
  advanceRate,
  advanceAmount,
  balanceAmount,
  daysBefore,
  releaseDueAt,
  currency,
  note,
}: Props) {
  const due = releaseDueAt ? new Date(releaseDueAt) : null;
  const dueLabel =
    due && !Number.isNaN(due.getTime())
      ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : null;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.info.main, 0.06),
        border: (t) => `1px solid ${alpha(t.palette.info.main, 0.2)}`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <ScheduleSendIcon sx={{ fontSize: 20, color: 'info.main', mt: 0.25 }} />
        <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Payment schedule
          </Typography>

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
              {daysBefore != null && daysBefore > 0
                ? `, ${daysBefore} days before your event.`
                : '.'}
            </Typography>

            <Typography variant="body2">
              The remaining{' '}
              <Box component="span" fontWeight={700}>
                {formatMoney(balanceAmount, currency)}
              </Box>{' '}
              stays protected by Sinnapi until you confirm the service was delivered.
            </Typography>
          </Stack>

          {note && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              “{note}”
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
