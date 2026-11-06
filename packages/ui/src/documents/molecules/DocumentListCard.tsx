'use client';
import type { ReactNode } from 'react';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';

export type DocumentListCardProps = {
  title: string;
  amount: string;
  meta: string;
  chip: ReactNode;
  onClick: () => void;
};

/**
 * One invoice or receipt on a phone, where a seven-column table would mean
 * scrolling sideways to find the amount. Name and amount on top, number and
 * date with the status underneath.
 */
export function DocumentListCard({ title, amount, meta, chip, onClick }: DocumentListCardProps) {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={onClick} sx={{ p: 1.75 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="baseline">
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
              {title}
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
            >
              {amount}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
            <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
              {meta}
            </Typography>
            <Box sx={{ flexShrink: 0 }}>{chip}</Box>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
