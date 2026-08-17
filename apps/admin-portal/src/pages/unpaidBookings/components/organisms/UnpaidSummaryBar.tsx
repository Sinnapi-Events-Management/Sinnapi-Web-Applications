import { Box, Paper, Stack, Typography } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { UnpaidBookingCounts } from '@/lib/types';

type Props = { counts: UnpaidBookingCounts | undefined };

type Stat = {
  label: string;
  value: string;
  hint: string;
  tone: 'error' | 'warning' | 'default';
};

/**
 * The three numbers that decide how this queue gets worked today.
 *
 * Deliberately not a chart. The question is "how much of my morning is this",
 * and the answer is a count, a count, and a figure — a sparkline would take the
 * same space to say something nobody asked.
 *
 * The money line is the one that earns its place. Six overdue bookings reads as
 * a small backlog until it is six overdue bookings worth twelve million
 * shillings of vendor dates being held for nothing, and that is the version
 * that gets worked before lunch.
 */
export default function UnpaidSummaryBar({ counts }: Props) {
  const stats: Stat[] = [
    {
      label: 'Overdue',
      value: String(counts?.overdue ?? 0),
      hint: 'Deadline passed, nothing cancelled',
      tone: 'error',
    },
    {
      label: 'Due within 6 hours',
      value: String(counts?.due_soon ?? 0),
      hint: 'Still payable — worth a reminder',
      tone: 'warning',
    },
    {
      label: 'Value overdue',
      value: formatMoney(counts?.overdue_value ?? 0, counts?.currency ?? 'UGX'),
      hint: 'Vendor dates held against unpaid bookings',
      tone: 'default',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        mb: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
      }}
    >
      {stats.map((s) => (
        <Paper key={s.label} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {s.label}
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              color={
                s.tone === 'error'
                  ? 'error.main'
                  : s.tone === 'warning'
                    ? 'warning.main'
                    : 'text.primary'
              }
            >
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.hint}
            </Typography>
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
