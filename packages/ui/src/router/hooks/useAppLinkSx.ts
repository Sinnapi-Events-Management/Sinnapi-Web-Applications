import { useMemo } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

export interface UseAppLinkSxOptions {
  /** Palette path applied at rest and on hover, e.g. `primary.main`. */
  color: string;
  /** Caller overrides, merged last so they always win. */
  sx?: SxProps<Theme>;
}

/**
 * Style logic for `AppLink`, kept out of the component so the markup stays
 * declarative: brand colour, no underline at rest, underline restored on hover
 * and keyboard focus (WCAG 1.4.1 — colour alone must not carry the affordance).
 */
export function useAppLinkSx({ color, sx }: UseAppLinkSxOptions): SxProps<Theme> {
  return useMemo(
    () =>
      [
        {
          color,
          textDecoration: 'none',
          textUnderlineOffset: '0.2em',
          fontWeight: 900,
          '&:hover, &:focus-visible': { color, textDecoration: 'underline' },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>,
    [color, sx],
  );
}
