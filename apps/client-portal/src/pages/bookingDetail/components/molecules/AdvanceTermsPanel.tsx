import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import AdvanceScheduleSummary from './AdvanceScheduleSummary';

type Props = {
  advanceRate: number | null;
  advanceAmount: number | null;
  balanceAmount: number | null;
  daysBefore: number | null;
  releaseDueAt: string | null;
  currency: string | null;
  note: string | null;
  /** The rate control, when the client is still free to choose one. */
  control?: ReactNode;
  /** Dims the figures while a new split is being priced. */
  isRepricing?: boolean;
};

/**
 * The payment schedule: what the client is choosing, and what that means.
 *
 * The control and the consequence sit in one panel deliberately. The client
 * is being asked to let money leave before the service happens, so the figure
 * they are moving and the sentence describing what it does are never more
 * than a line apart.
 */
export default function AdvanceTermsPanel({
  advanceRate,
  advanceAmount,
  balanceAmount,
  daysBefore,
  releaseDueAt,
  currency,
  note,
  control,
  isRepricing,
}: Props) {
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
        <ScheduleSendIcon sx={{ fontSize: 20, color: 'secondary.main', mt: 0.25 }} />
        <Stack spacing={1.25} sx={{ minWidth: 0, flex: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Payment schedule
            </Typography>
            {control && (
              <Typography variant="caption" color="text.secondary">
                Choose how much of your vendor&rsquo;s fee is released before the event.
              </Typography>
            )}
          </Box>

          {control}

          <Box
            sx={{
              opacity: isRepricing ? 0.5 : 1,
              transition: 'opacity .15s',
            }}
            aria-busy={isRepricing || undefined}
          >
            <AdvanceScheduleSummary
              advanceRate={advanceRate}
              advanceAmount={advanceAmount}
              balanceAmount={balanceAmount}
              daysBefore={daysBefore}
              releaseDueAt={releaseDueAt}
              currency={currency}
            />
          </Box>

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
