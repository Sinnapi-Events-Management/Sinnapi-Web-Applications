'use client';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';

type Props = {
  url: string | null;
  loading: boolean;
  title: string;
  /** False on phones — see `useInlinePdfSupport`. */
  inline: boolean;
  onOpenInViewer: () => void;
};

/**
 * The document itself: drawn in the page where the browser can, otherwise a
 * card that opens it in the device's PDF viewer. A spinner while it renders.
 */
export function PdfPreviewFrame({ url, loading, title, inline, onOpenInViewer }: Props) {
  if (loading || !url) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ height: '100%', py: 6 }}
      >
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Preparing preview…
        </Typography>
      </Stack>
    );
  }

  if (!inline) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={2}
        sx={{ height: '100%', py: 6, px: 3, textAlign: 'center' }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'primary.main',
          }}
        >
          <PictureAsPdfOutlinedIcon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Your PDF is ready
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Open it in your phone’s PDF viewer to read every page.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<OpenInNewIcon />} onClick={onOpenInViewer}>
          Open PDF
        </Button>
      </Stack>
    );
  }

  return (
    <Box
      component="iframe"
      // `view=FitH` fits the page width; the browser's own toolbar stays for
      // zoom and print.
      src={`${url}#view=FitH`}
      title={title}
      sx={{ border: 0, width: '100%', height: '100%', display: 'block', bgcolor: 'action.hover' }}
    />
  );
}
