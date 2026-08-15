'use client';
import type { ReactNode } from 'react';
import { Box, Divider, Popover, Stack, Typography } from '@mui/material';

export type PortalMenuPanelProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  title: string;
  /** Second line under the title — usually the unread summary. */
  subtitle?: string;
  /** Controls in the header's trailing edge, e.g. mark-all-read. */
  headerAction?: ReactNode;
  /** Pinned to the bottom edge; the "see everything" escape hatch. */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * The chrome shared by every top-bar preview panel: a titled header, a
 * scrolling body, and a footer that never scrolls away.
 *
 * Extracted because the messages and notifications panels differ only in what
 * they list. Two hand-built popovers drift within a release — one gets a
 * max-height, the other does not, and the pair stops reading as one control.
 *
 * Sized in `min()` against the viewport rather than at a fixed width: the top
 * bar exists on phones too, and a 380px panel anchored to a right-edge icon on
 * a 360px screen would hang off it.
 */
export function PortalMenuPanel({
  anchorEl,
  open,
  onClose,
  title,
  subtitle,
  headerAction,
  footer,
  children,
}: PortalMenuPanelProps) {
  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      slotProps={{
        paper: {
          // A dialog rather than a menu: the body holds links and buttons in a
          // list, not a single set of menu items, and menu semantics would
          // promise arrow-key navigation this content does not have.
          role: 'dialog',
          'aria-label': title,
          sx: {
            mt: 1,
            width: 'min(392px, calc(100vw - 32px))',
            maxHeight: 'min(70vh, 560px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {headerAction}
      </Stack>

      <Divider />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, py: 1 }}>{children}</Box>

      {footer && (
        <>
          <Divider />
          <Box sx={{ p: 1, flexShrink: 0 }}>{footer}</Box>
        </>
      )}
    </Popover>
  );
}
