'use client';
import type { ReactNode } from 'react';
import { Divider, Stack } from '@mui/material';

/**
 * A run of `SettingsRow`s with hairlines between them.
 *
 * Exists so the divider rule is stated once: MUI's `divider` prop draws between
 * children and not around them, which is exactly right here and exactly what
 * gets re-derived by hand — as a trailing `<Divider>` per row, plus a
 * `:last-child` override to take the final one back off — every time it is not.
 */
export function SettingsRowGroup({ children }: { children: ReactNode }) {
  return (
    <Stack divider={<Divider flexItem />} spacing={0}>
      {children}
    </Stack>
  );
}
