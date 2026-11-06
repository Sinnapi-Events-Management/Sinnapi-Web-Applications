'use client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PdfDownloadButton } from '../../molecules/PdfDownloadButton';
import { useInlinePdfSupport } from './hooks/useInlinePdfSupport';
import { PdfPreviewFrame } from './PdfPreviewFrame';
import type { PdfDocumentState } from './hooks/usePdfDocument';

type Props = { pdf: PdfDocumentState; title: string };

/**
 * The file exactly as it will be saved, before it is saved. Full screen on
 * phones; a tall sheet on larger screens so a whole A4 page is readable.
 * Download is right here, so preview → download is one more tap.
 */
export function PdfPreviewDialog({ pdf, title }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const inline = useInlinePdfSupport();
  const loading = pdf.busy === 'preview';

  return (
    <Dialog
      open={pdf.previewOpen}
      onClose={pdf.closePreview}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="pdf-preview-title"
      PaperProps={{ sx: { height: fullScreen ? '100%' : '90vh' } }}
    >
      <DialogTitle id="pdf-preview-title" sx={{ pr: 7 }}>
        {title}
        <IconButton
          aria-label="Close preview"
          onClick={pdf.closePreview}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {pdf.error && (
          <Alert severity="error" onClose={pdf.clearError} sx={{ m: 2 }}>
            {pdf.error}
          </Alert>
        )}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <PdfPreviewFrame
            url={pdf.previewUrl}
            loading={loading}
            title={title}
            inline={inline}
            onOpenInViewer={pdf.openInViewer}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={pdf.closePreview}>Close</Button>
        <PdfDownloadButton
          variant="contained"
          onClick={() => void pdf.download()}
          busy={pdf.busy === 'download'}
          sx={{ ml: '0 !important' }}
        />
      </DialogActions>
    </Dialog>
  );
}
