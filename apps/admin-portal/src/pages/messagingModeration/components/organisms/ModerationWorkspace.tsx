import { Box, Paper, Drawer, useMediaQuery } from '@sinnapi/ui';

type Props = {
  /** The master column: toolbar, bulk bar and the flag list. */
  master: React.ReactNode;
  /** The detail column: the review pane for the active flag. */
  detail: React.ReactNode;
  /** Whether a flag is open — drives the mobile drawer. */
  detailOpen: boolean;
  onCloseDetail: () => void;
};

/**
 * Responsive master–detail shell for the moderation page. On desktop the two
 * columns sit side by side with a sticky, independently-scrolling review pane;
 * on small screens the list takes the full width and the review pane slides in
 * as a right-hand drawer. Layout only — it owns no moderation state.
 */
export default function ModerationWorkspace({ master, detail, detailOpen, onCloseDetail }: Props) {
  // Matches MUI's `md` breakpoint; avoids threading the theme type through here.
  const isDesktop = useMediaQuery('(min-width:900px)');

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: '1 1 0', minWidth: 0, maxWidth: 460 }}>{master}</Box>
        <Paper
          variant="outlined"
          sx={{
            flex: '1 1 0',
            minWidth: 0,
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            position: 'sticky',
            top: 16,
            minHeight: 420,
            maxHeight: 'calc(100vh - 32px)',
            overflow: 'auto',
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
        PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, p: { xs: 2, sm: 3 } } }}
      >
        {detail}
      </Drawer>
    </>
  );
}
