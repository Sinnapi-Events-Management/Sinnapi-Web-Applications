'use client';
import { forwardRef } from 'react';
import { Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAppLinkSx } from '../hooks/useAppLinkSx';
import type { AppLinkProps } from '../types';

/** Default palette path — brand primary, matching contained primary buttons. */
const DEFAULT_COLOR = 'primary.main';

/**
 * The in-app text link for the router-driven portals: a MUI `Link` rendered as
 * react-router's `Link`, so client-side navigation and design-system typography
 * come from one place instead of a bare `<a>` with browser-default styling.
 *
 * Lives outside the `atoms` barrel because `@sinnapi/ui` is also consumed by the
 * Next.js `web-public` app, which has no react-router dependency. Import it from
 * the dedicated `@sinnapi/ui/router` entry point.
 */
export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  { color = DEFAULT_COLOR, sx, ...props },
  ref,
) {
  const linkSx = useAppLinkSx({ color: String(color), sx });

  return <MuiLink ref={ref} component={RouterLink} underline="none" sx={linkSx} {...props} />;
});
