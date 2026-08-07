'use client';
import type { ReactNode } from 'react';
import { Card, CardActionArea, CardContent, Stack, Typography, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Optional icon/element shown on the right. Rendered in the portals' gold. */
  icon?: ReactNode;
  /** Optional sub-line (e.g. "+12% vs last week"). */
  caption?: ReactNode;
  captionColor?: 'success.main' | 'error.main' | 'text.secondary';
  /** When set, the whole tile becomes a link to this route. */
  to?: LinkProps['to'];
  /**
   * `lg` renders the dashboard-hero number; `md` (default) the denser figure
   * used in detail-page stat rows.
   */
  size?: 'md' | 'lg';
};

/**
 * Dashboard metric tile: label, big value, optional icon and caption. Optionally
 * the entire tile is a router link.
 *
 * Lives outside the root barrel because it depends on react-router-dom, which
 * only the SPA portals install — the Next.js `web-public` app must never pull it
 * into its module graph. Import from `@sinnapi/ui/router`.
 */
export function StatCard({
  label,
  value,
  icon,
  caption,
  captionColor = 'text.secondary',
  to,
  size = 'md',
}: StatCardProps) {
  const inner = (
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" color="text.secondary">
            {label}
          </Typography>
          <Typography
            variant={size === 'lg' ? 'h2' : 'h4'}
            sx={{ mt: 0.5, ...(size === 'lg' && { fontSize: '2.25rem' }) }}
          >
            {value}
          </Typography>
          {caption && (
            <Typography variant="body2" sx={{ mt: 0.5 }} color={captionColor}>
              {caption}
            </Typography>
          )}
        </Box>
        {/* Gold, not teal: the icon is decoration on an action-coloured surface,
            and teal is reserved for wayfinding. */}
        {icon && <Box sx={{ color: 'secondary.main' }}>{icon}</Box>}
      </Stack>
    </CardContent>
  );

  return (
    <Card variant="outlined">
      {to ? (
        <CardActionArea component={RouterLink} to={to}>
          {inner}
        </CardActionArea>
      ) : (
        inner
      )}
    </Card>
  );
}
