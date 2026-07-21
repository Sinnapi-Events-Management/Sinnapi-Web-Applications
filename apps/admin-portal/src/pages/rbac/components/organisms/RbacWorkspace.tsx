import { Box, Paper, Drawer, useMediaQuery } from '@sinnapi/ui';

type Props = {
  /** The master column: role search and the role cards. */
  master: React.ReactNode;
  /** The detail column: the permission editor for the open role. */
  detail: React.ReactNode;
  /** Whether a role is open — drives the mobile drawer. */
  detailOpen: boolean;
  onCloseDetail: () => void;
};

/**
 * Responsive master–detail shell for the RBAC editor. On desktop the roles list
 * and the permission pane sit side by side, each scrolling independently; on
 * small screens the roles take the full width and the editor slides in as a
 * full-height drawer. Layout only — it owns no RBAC state.
 *
 * The detail column takes the larger share here (unlike the notification feed's
 * even split): a permission row carries a monospace key, a description and a
 * switch, and cramming that into half the width wraps every line.
 */
export default function RbacWorkspace({ master, detail, detailOpen, onCloseDetail }: Props) {
  // Matches MUI's `md` breakpoint; avoids threading the theme type through here.
  const isDesktop = useMediaQuery('(min-width:900px)');

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            flex: '0 0 auto',
            width: { md: 300, lg: 340 },
            minWidth: 0,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            // Nothing inside may widen this column — an overflowing child would
            // paint over its neighbour instead of shrinking.
            overflowX: 'hidden',
            // Room for the cards' focus rings and shadows.
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
            width: { xs: '100%', sm: 520 },
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
