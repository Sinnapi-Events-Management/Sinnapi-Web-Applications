'use client';
import type { ReactNode } from 'react';
import { Paper, Stack, Typography, Skeleton } from '@mui/material';
import { IconBadge } from '../../molecules/IconBadge';
import type { NotificationAccent } from '../types';

export type NotificationStatTileProps = {
  label: string;
  value: number;
  icon: ReactNode;
  accent: NotificationAccent;
  loading?: boolean;
};

/** One figure in the summary row: a tinted glyph, the count, and its label. */
export function NotificationStatTile({
  label,
  value,
  icon,
  accent,
  loading,
}: NotificationStatTileProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <IconBadge accent={accent} size={40}>
          {icon}
        </IconBadge>
        <Stack sx={{ minWidth: 0 }}>
          {loading ? (
            <Skeleton variant="text" width={48} height={32} />
          ) : (
            <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" noWrap>
            {label}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
