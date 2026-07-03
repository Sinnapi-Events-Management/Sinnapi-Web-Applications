import { Box, Chip, Paper, Stack, Typography } from '@sinnapi/ui/atoms';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import ScrollReveal from '@/components/atoms/scrollReveal';
import type { Journey } from '../data/journeys';

/**
 * A single vertical, connected timeline. Each step is a gradient node on a
 * continuous rail beside a content card; nodes reveal with a gentle stagger as
 * the column scrolls into view. Reusable across audiences — the client and
 * vendor journeys are just two instances with different data.
 */
export default function StepTimeline({ eyebrow, title, subtitle, steps }: Journey) {
  return (
    <Box>
      <Chip
        label={eyebrow}
        color="primary"
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600 }}
      />
      <Typography variant="h4" sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        {subtitle}
      </Typography>

      <Box>
        {steps.map(({ Icon, title: stepTitle, body }, i) => {
          const isLast = i === steps.length - 1;
          return (
            <ScrollReveal key={stepTitle} delay={i * 90}>
              {/* `alignItems: stretch` lets the rail span the card + the bottom gap,
                  so the connecting line runs continuously between nodes. */}
              <Stack direction="row" spacing={2.5} alignItems="stretch" sx={{ pb: isLast ? 0 : 3 }}>
                <Stack alignItems="center" sx={{ flexShrink: 0 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'common.white',
                      background: `linear-gradient(135deg, ${palette.light.primary.main}, ${palette.light.primary.dark})`,
                      boxShadow: 2,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  {!isLast && (
                    <Box
                      sx={{
                        flexGrow: 1,
                        width: 2,
                        mt: 1,
                        bgcolor: withAlpha(palette.light.primary.main, 0.25),
                      }}
                    />
                  )}
                </Stack>

                <Paper
                  variant="outlined"
                  sx={{
                    flexGrow: 1,
                    p: 2.5,
                    transition: 'box-shadow .2s, transform .2s, border-color .2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <Typography variant="overline" color="text.disabled" sx={{ fontWeight: 700 }}>
                    Step {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Typography variant="h6" sx={{ mt: 0.5 }}>
                    {stepTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {body}
                  </Typography>
                </Paper>
              </Stack>
            </ScrollReveal>
          );
        })}
      </Box>
    </Box>
  );
}
