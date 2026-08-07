'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type PageTitleProps = {
  title: string;
  subtitle?: string;
  /** Optional trailing element — typically the page's primary action. */
  action?: ReactNode;
};

/** Standard page header: title, optional subtitle, optional right-aligned action. */
export function PageTitle({ title, subtitle, action }: PageTitleProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ sm: 'center' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h3">{title}</Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
