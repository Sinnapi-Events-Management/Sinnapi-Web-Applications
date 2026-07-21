import { Box, Paper, Drawer, useMediaQuery } from '@sinnapi/ui';

type Props = {
  /** The master column: toolbar and conversation list. */
  master: React.ReactNode;
  /** The detail column: the thread pane for the open conversation. */
  detail: React.ReactNode;
  /** Whether a conversation is open — drives the mobile drawer. */
  detailOpen: boolean;
  onCloseDetail: () => void;
};

/**
 * Responsive master–detail shell for the inbox. On desktop the two columns sit
 * side by side, the list scrolling independently of a sticky thread pane whose
 * composer stays pinned to the bottom; on small screens the list takes the full
 * width and the thread slides in as a full-height drawer. Layout only — it owns
 * no inbox state.
 */
export default function InboxWorkspace({ master, detail, detailOpen, onCloseDetail }: Props) {
  // Matches MUI's `md` breakpoint; avoids threading the theme type through here.
  const isDesktop = useMediaQuery('(min-width:900px)');

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            // Just past the breakpoint both columns are tight, so the list gives
            // the thread pane room until there is enough width to share.
            maxWidth: { md: 380, lg: 440 },
            maxHeight: 'calc(100vh - 120px)',
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
            p: { xs: 2, sm: 3 },
            position: 'sticky',
            top: 16,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 120px)',
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
            p: { xs: 2, sm: 3 },
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
