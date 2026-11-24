import { Box, Stack, Typography, alpha } from '@sinnapi/ui';
import CheckIcon from '@mui/icons-material/Check';

type Props = {
  steps: string[];
  /** Index of the current step; every step before it is done. `steps.length` = all done. */
  current: number;
  ariaLabel?: string;
};

/**
 * Where a booking or quote is on its road, in four or five short words. Drawn by hand
 * rather than with MUI's Stepper so it fits a 360px phone without scrolling:
 * dots on one line, labels under them in small type.
 */
export default function ProgressSteps({ steps, current, ariaLabel = 'Progress' }: Props) {
  if (steps.length === 0) return null;
  return (
    <Stack
      direction="row"
      component="ol"
      aria-label={ariaLabel}
      sx={{ listStyle: 'none', p: 0, m: 0, mb: 2.5 }}
    >
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <Box
            component="li"
            key={label}
            aria-current={now ? 'step' : undefined}
            sx={{ flex: 1, minWidth: 0, position: 'relative', textAlign: 'center' }}
          >
            {i > 0 && (
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: 11,
                  right: '50%',
                  width: '100%',
                  height: 2,
                  bgcolor: (t) => (i <= current ? t.palette.success.main : t.palette.divider),
                }}
              />
            )}
            <Box
              sx={{
                position: 'relative',
                mx: 'auto',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: (t) =>
                  done
                    ? t.palette.success.main
                    : now
                      ? t.palette.secondary.main
                      : t.palette.background.paper,
                border: (t) => (done || now ? 'none' : `2px solid ${t.palette.divider}`),
                boxShadow: (t) =>
                  now ? `0 0 0 4px ${alpha(t.palette.secondary.main, 0.25)}` : 'none',
                color: 'common.white',
              }}
            >
              {done && <CheckIcon sx={{ fontSize: 16 }} />}
            </Box>
            <Typography
              variant="caption"
              display="block"
              sx={{
                mt: 0.75,
                lineHeight: 1.2,
                fontWeight: now ? 700 : 400,
                color: done || now ? 'text.primary' : 'text.secondary',
              }}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
