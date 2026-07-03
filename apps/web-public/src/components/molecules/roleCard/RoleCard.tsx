import type { ElementType } from 'react';
import NextLink from 'next/link';
import { Box, Paper, Stack, Typography } from '@sinnapi/ui';
import { ArrowForward } from '@sinnapi/ui/icons';
import { withAlpha, palette } from '@sinnapi/ui/tokens';

export type RoleCardProps = {
  /** Leading glyph rendered inside the tinted tile. */
  Icon: ElementType;
  title: string;
  description: string;
  /** Destination — the whole card is the link, so there is no nested anchor. */
  href: string;
  /** Visible affordance text (styled as a button, not a real anchor). */
  ctaLabel: string;
  /** Pulls the primary path forward with a tinted surface + accent ring. */
  featured?: boolean;
};

/**
 * A single sign-in / sign-up route choice (e.g. "Client", "Vendor").
 *
 * The entire Paper is the link — one large, unambiguous tap target — so the
 * "cta" row is a styled Box, never a nested <a>. Hover/focus lift and the
 * sliding arrow are pure CSS (`&:hover`/`&:focus-visible`), keeping this a
 * server component with zero client JS.
 */
export default function RoleCard({
  Icon,
  title,
  description,
  href,
  ctaLabel,
  featured = false,
}: RoleCardProps) {
  return (
    <Paper
      component={NextLink}
      href={href}
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: { xs: 2.5, md: 3 },
        borderRadius: 3,
        textDecoration: 'none',
        color: 'text.primary',
        borderColor: featured ? withAlpha(palette.light.primary.main, 0.4) : 'divider',
        bgcolor: featured ? withAlpha(palette.light.primary.main, 0.04) : 'background.paper',
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          borderColor: 'primary.main',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: withAlpha(palette.light.primary.main, 0.1),
          mb: 2,
        }}
      >
        <Icon fontSize="medium" />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, flexGrow: 1 }}>
        {description}
      </Typography>

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          mt: 2.5,
          fontWeight: 600,
          color: 'primary.main',
          '& .role-card-arrow': {
            transition: 'transform .2s ease',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          },
          'a:hover & .role-card-arrow, a:focus-visible & .role-card-arrow': {
            transform: 'translateX(4px)',
          },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'inherit' }}>
          {ctaLabel}
        </Typography>
        <ArrowForward className="role-card-arrow" fontSize="small" />
      </Stack>
    </Paper>
  );
}
