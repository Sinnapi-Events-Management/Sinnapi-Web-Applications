'use client';
import { forwardRef, useEffect, useState } from 'react';
import { IconButton, Tooltip, type IconButtonProps } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { DarkMode, LightMode } from '@mui/icons-material';

/**
 * Icon button that flips the app between light and dark color schemes. Relies on
 * a `ColorModeProvider` (CSS-variables) ancestor and persists the choice via
 * MUI's `useColorScheme`. Inherits `color` so it sits correctly on both the
 * transparent hero navbar and solid surfaces.
 *
 * `useColorScheme().mode` is `undefined` until the client mounts, so the toggle
 * renders a disabled placeholder during SSR/hydration to avoid a markup
 * mismatch, then becomes interactive.
 */
export type ThemeToggleProps = Omit<IconButtonProps, 'onClick' | 'aria-label'>;

export const ThemeToggle = forwardRef<HTMLButtonElement, ThemeToggleProps>(function ThemeToggle(
  { color = 'inherit', ...props },
  ref,
) {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <IconButton ref={ref} color={color} disabled aria-hidden {...props}>
        <DarkMode />
      </IconButton>
    );
  }

  const isDark = mode === 'dark';
  const label = `Switch to ${isDark ? 'light' : 'dark'} mode`;
  const { sx, ...rest } = props;

  return (
    <Tooltip title={label}>
      <IconButton
        ref={ref}
        color={color}
        aria-label={label}
        onClick={() => setMode(isDark ? 'light' : 'dark')}
        {...rest}
        sx={[...(Array.isArray(sx) ? sx : [sx]), mode === 'light' && { color: 'primary.main' }]}
      >
        {isDark ? <LightMode /> : <DarkMode />}
      </IconButton>
    </Tooltip>
  );
});
