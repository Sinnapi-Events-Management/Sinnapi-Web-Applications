'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { InfoTip } from './InfoTip';

export type PageTitleProps = {
  title: string;
  subtitle?: string;
  /** Optional trailing element — typically the page's primary action. */
  action?: ReactNode;
  /**
   * Plain-words explanation of the title, behind a tap-to-open ⓘ beside it.
   * For pages named with a term people may not know, such as "Escrow".
   */
  titleHint?: ReactNode;
};

/** Standard page header: title, optional subtitle, optional right-aligned action. */
export function PageTitle({ title, subtitle, action, titleHint }: PageTitleProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ sm: 'center' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        {titleHint ? (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="h3">{title}</Typography>
            <InfoTip title={titleHint} label={`What is ${title.toLowerCase()}?`} />
          </Stack>
        ) : (
          <Typography variant="h3">{title}</Typography>
        )}
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
