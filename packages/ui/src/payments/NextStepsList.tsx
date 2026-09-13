'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { AccentColor } from '../molecules/IconBadge';

export type NextStepsListProps = {
  /** `null` suppresses the heading, for a caller that renders its own. */
  title?: string | null;
  steps: ReactNode[];
  /** Tint for the step markers. Matches the outcome's accent. */
  accent?: AccentColor;
};

/**
 * "What happens next", numbered.
 *
 * A payment confirmation is read once, at the moment of paying, and the
 * question it has to answer is not "what did I pay" — the receipt beside it
 * covers that — but "and now what". Numbered rather than bulleted because
 * the steps happen in order and on dates.
 *
 * The markers are joined by a hairline so the four steps read as one sequence
 * rather than four separate notices. It is drawn per-item and hidden on the
 * last, which keeps the run exactly as long as the steps are — a single
 * absolutely-positioned spine has to guess the final item's height and
 * overshoots past the last number whenever a step wraps to two lines.
 *
 * `title` accepts `null` because the heading used to be rendered twice: the
 * confirmed card wrote its own "What happens next" above a list that also
 * printed the default, and the payer saw the same line twice.
 */
export function NextStepsList({
  title = 'What happens next',
  steps,
  accent = 'secondary',
}: NextStepsListProps) {
  return (
    <Stack spacing={1.5}>
      {title && (
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: '0.08em', lineHeight: 1.4 }}
        >
          {title}
        </Typography>
      )}
      <Stack component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {steps.map((step, i) => (
          <Stack
            component="li"
            key={i}
            direction="row"
            spacing={1.75}
            alignItems="flex-start"
            sx={{ '&:not(:last-of-type)': { pb: 2 } }}
          >
            <Stack alignItems="center" sx={{ flex: 'none', alignSelf: 'stretch' }}>
              <Box
                aria-hidden
                sx={{
                  flex: 'none',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: `${accent}.main`,
                  bgcolor: (t) => alpha(t.palette[accent].main, 0.14),
                }}
              >
                {i + 1}
              </Box>
              {i < steps.length - 1 && (
                <Box
                  aria-hidden
                  sx={{
                    width: '1px',
                    flex: 1,
                    mt: 0.75,
                    bgcolor: (t) => alpha(t.palette[accent].main, 0.22),
                  }}
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 0.375, minWidth: 0 }}>
              {step}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
