import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import AdvanceScheduleTimeline from './AdvanceScheduleTimeline';

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
 * The control and the consequence sit together deliberately. The client is
 * being asked to let money leave before the service happens, so the figure
 * they are moving and the timeline showing what it does are never more than a
 * glance apart. The heading around it belongs to the checkout section; this
 * is only the body.
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
    <Stack spacing={2}>
      {control}

      <Box
        aria-busy={isRepricing || undefined}
        sx={{ opacity: isRepricing ? 0.5 : 1, transition: 'opacity .15s' }}
      >
        <AdvanceScheduleTimeline
          advanceRate={advanceRate}
          advanceAmount={advanceAmount}
          balanceAmount={balanceAmount}
          daysBefore={daysBefore}
          releaseDueAt={releaseDueAt}
          currency={currency}
        />
      </Box>

      {note && (
        <Box
          component="blockquote"
          sx={{
            m: 0,
            pl: 1.5,
            borderLeft: '3px solid',
            borderColor: (t) => alpha(t.palette.secondary.main, 0.5),
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Your vendor: &ldquo;{note}&rdquo;
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
