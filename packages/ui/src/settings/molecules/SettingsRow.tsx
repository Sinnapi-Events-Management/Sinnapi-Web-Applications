'use client';
import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export type SettingsRowProps = {
  title: string;
  /** One sentence on what the control does and what it will cost the user. */
  description?: ReactNode;
  /** The control itself — a button, a chip, a link. */
  action?: ReactNode;
  /** Status or feedback rendered under the description, full width. */
  children?: ReactNode;
};

/**
 * One setting: a label, its explanation, and the control that acts on it.
 *
 * The row is the unit the whole settings page is built from, so the two portals
 * cannot drift on how a setting is presented. It stacks on narrow screens with
 * the action going full-width — a right-aligned button beside two lines of
 * explanatory text is the layout that breaks first on a phone.
 */
export function SettingsRow({ title, description, action, children }: SettingsRowProps) {
  return (
    <Box sx={{ py: 2, '&:first-of-type': { pt: 0 }, '&:last-of-type': { pb: 0 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 460 }}>
              {description}
            </Typography>
          )}
        </Box>
        {action && (
          <Box sx={{ flexShrink: 0, '& > *': { width: { xs: '100%', sm: 'auto' } } }}>{action}</Box>
        )}
      </Stack>
      {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
    </Box>
  );
}
