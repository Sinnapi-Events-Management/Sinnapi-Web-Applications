'use client';
import { Box, Paper, Drawer, useMediaQuery } from '@mui/material';

export type InboxLayoutProps = {
  /** The master column: toolbar and conversation list. */
  master: React.ReactNode;
  /** The detail column: the thread pane for the open conversation. */
  detail: React.ReactNode;
  /** Whether a conversation is open — drives the mobile drawer. */
  detailOpen: boolean;
  onCloseDetail: () => void;
  /** Vertical space already consumed by page chrome above the inbox. */
  offsetPx?: number;
};

/**
 * Responsive master–detail shell, promoted from the admin portal's
 * `InboxWorkspace` so all three inboxes share one geometry.
 *
 * On desktop the two columns sit side by side, the list scrolling independently
 * of a sticky thread pane. On small screens the list takes the full width and
 * the thread slides in as a full-height drawer — a two-pane layout at 390px
 * gives neither pane enough room to be usable, and a chat thread in particular
 * needs the whole width for its bubbles to breathe.
 *
 * Both columns are fixed-height rather than page-scrolled, which is what lets
 * the thread keep its composer pinned to the bottom and own its own scroll
 * anchoring. Layout only — it holds no inbox state.
 */
export function InboxLayout({
  master,
  detail,
  detailOpen,
  onCloseDetail,
  offsetPx = 120,
}: InboxLayoutProps) {
  // Matches MUI's `md`; avoids threading the theme type through here.
  const isDesktop = useMediaQuery('(min-width:900px)');

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            // Just past the breakpoint both columns are tight, so the list
            // yields room to the thread until there is enough width to share.
            maxWidth: { md: 380, lg: 440 },
            maxHeight: `calc(100vh - ${offsetPx}px)`,
            overflowY: 'auto',
            // Nothing inside may widen this column — an overflowing child would
            // paint over its neighbour instead of shrinking.
            overflowX: 'hidden',
            // Room for the list's focus rings and card shadows.
            px: 0.5,
            py: 0.5,
          }}
        >
          {master}
        </Box>
        <Paper
          variant="outlined"
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
            position: 'sticky',
            top: 16,
            display: 'flex',
            flexDirection: 'column',
            height: `calc(100vh - ${offsetPx}px)`,
            minHeight: 420,
          }}
        >
          {detail}
        </Paper>
      </Box>
    );
  }

  return (
    <>
      {master}
      <Drawer
        anchor="right"
        open={detailOpen}
        onClose={onCloseDetail}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480 },
            p: { xs: 1.5, sm: 2.5 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {detail}
      </Drawer>
    </>
  );
}
