import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

/**
 * A document preview on its own. The backdrop behind the paper is a soft
 * grey in light mode and the theme's own surface in dark mode — the paper
 * itself stays white either way.
 */
export default function PreviewDialog({ open, title, onClose, children }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      scroll="paper"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default', px: { xs: 1.5, sm: 3 }, py: 3 }}>
        <Box>{children}</Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
