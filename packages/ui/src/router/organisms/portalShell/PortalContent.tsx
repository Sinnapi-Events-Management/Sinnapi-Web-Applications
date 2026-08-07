'use client';
import type { ReactNode } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { CONTENT_MAX_WIDTH } from './constants';
import { chromeTransition } from './portalShell.styles';
import type { PortalContentWidth } from './types';

export interface PortalContentProps {
  sidebarWidth: number;
  contentWidth: PortalContentWidth;
  /** Focus mode drops the top-bar spacer, since there is no top bar. */
  focus: boolean;
  banner?: ReactNode;
}

/** The page area: top-bar spacer, optional banner, then the routed page. */
export function PortalContent({ sidebarWidth, contentWidth, focus, banner }: PortalContentProps) {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        width: { md: `calc(100% - ${sidebarWidth}px)` },
        // A flex item's default `min-width: auto` lets it grow to fit its widest
        // child, so one over-wide element inside a page drags the whole shell
        // past the viewport and puts a horizontal scrollbar on every screen.
        // Pinning it to 0 keeps that overflow inside the page that caused it.
        minWidth: 0,
        transition: chromeTransition,
      }}
    >
      {!focus && <Toolbar />}
      <Box
        sx={{
          p: { xs: 2, md: 4 },
          mx: 'auto',
          maxWidth: contentWidth === 'contained' ? CONTENT_MAX_WIDTH : 'none',
        }}
      >
        {banner && <Box sx={{ mb: 3 }}>{banner}</Box>}
        <Outlet />
      </Box>
    </Box>
  );
}
