'use client';
import { type ReactNode } from 'react';
import { Card, CardContent, Stack, Typography, Box } from '@mui/material';

export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  /** Optional icon/element shown on the right. */
  icon?: ReactNode;
  /** Optional sub-line (e.g. "+12% vs last week"). */
  caption?: ReactNode;
  captionColor?: 'success.main' | 'error.main' | 'text.secondary';
};

/** Dashboard metric tile: label, big value, optional icon and caption. */
export function StatCard({
  label,
  value,
  icon,
  caption,
  captionColor = 'text.secondary',
}: StatCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            {caption && (
              <Typography variant="body2" sx={{ mt: 0.5 }} color={captionColor}>
                {caption}
              </Typography>
            )}
          </Box>
          {icon && <Box sx={{ color: 'primary.main' }}>{icon}</Box>}
        </Stack>
      </CardContent>
    </Card>
  );
}
