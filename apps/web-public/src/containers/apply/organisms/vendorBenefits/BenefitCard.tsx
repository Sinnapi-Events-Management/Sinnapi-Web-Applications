import type { ElementType } from 'react';
import { Box, Paper, Typography } from '@sinnapi/ui';
import { palette, withAlpha } from '@sinnapi/ui/tokens';

export type BenefitCardProps = { Icon: ElementType; title: string; body: string };

/**
 * A single vendor benefit — icon tile, heading and supporting line. Matches the
 * WhyChoose card treatment (outlined Paper, lift-on-hover) so the two grids feel
 * like one system across the site.
 */
export default function BenefitCard({ Icon, title, body }: BenefitCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        height: '100%',
        transition: 'box-shadow .2s, transform .2s, border-color .2s',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-4px)',
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.main',
          bgcolor: withAlpha(palette.light.primary.main, 0.1),
        }}
      >
        <Icon />
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {body}
      </Typography>
    </Paper>
  );
}
