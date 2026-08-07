'use client';
import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { IconBadge, type AccentColor } from '../molecules/IconBadge';

export type SectionCardProps = {
  title: string;
  icon?: ReactNode;
  /** Tint used for the icon badge and the top accent bar. Defaults to the portals' gold. */
  accent?: AccentColor;
  /** Optional element rendered on the right of the header (e.g. a chip/button). */
  action?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  sx?: object;
};

/**
 * Titled content card with a coloured icon badge and a thin accent bar — the
 * building block for detail-page sections across the portals.
 */
export function SectionCard({
  title,
  icon,
  accent = 'secondary',
  action,
  subtitle,
  children,
  sx,
}: SectionCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        '&::before': {
          content: '""',
          position: 'absolute',
          insetInline: 0,
          top: 0,
          height: 3,
          bgcolor: `${accent}.main`,
        },
        ...sx,
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
          {icon && <IconBadge accent={accent}>{icon}</IconBadge>}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
