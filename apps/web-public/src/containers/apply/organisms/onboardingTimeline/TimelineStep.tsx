import type { ElementType } from 'react';
import { Box, Stack, Typography } from '@sinnapi/ui/atoms';
import { palette, withAlpha } from '@sinnapi/ui/tokens';

export type TimelineStepProps = {
  index: number;
  Icon: ElementType;
  title: string;
  body: string;
  /** Hides the connector rail beneath the last step. */
  isLast?: boolean;
};

/**
 * One stage on the vertical onboarding rail: a numbered badge connected by a
 * line to the next step, with an icon-accented title and description. Vertical
 * on every breakpoint so the journey stays legible on mobile.
 */
export default function TimelineStep({ index, Icon, title, body, isLast }: TimelineStepProps) {
  return (
    <Stack direction="row" spacing={{ xs: 2, md: 3 }} alignItems="stretch">
      {/* Rail: numbered badge + connector line */}
      <Stack alignItems="center" sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: 'primary.contrastText',
            bgcolor: 'primary.main',
            boxShadow: `0 8px 20px ${withAlpha(palette.light.primary.main, 0.35)}`,
          }}
        >
          {index}
        </Box>
        {!isLast && (
          <Box
            aria-hidden
            sx={{
              width: 2,
              flexGrow: 1,
              mt: 1,
              bgcolor: withAlpha(palette.light.primary.main, 0.22),
            }}
          />
        )}
      </Stack>

      {/* Content */}
      <Box sx={{ pb: isLast ? 0 : { xs: 4, md: 5 } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon aria-hidden sx={{ color: 'primary.main' }} fontSize="small" />
          <Typography variant="h6">{title}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 520 }}>
          {body}
        </Typography>
      </Box>
    </Stack>
  );
}
