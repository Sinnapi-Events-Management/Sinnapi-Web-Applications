'use client';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { PdfDownloadButton } from '../../molecules/PdfDownloadButton';
import { PdfPreviewDialog } from './PdfPreviewDialog';
import type { PdfDocumentState } from './hooks/usePdfDocument';

type Props = {
  pdf: PdfDocumentState;
  /** The preview dialog's heading, e.g. `Quotation SQ1569ATB9`. */
  previewTitle: string;
};

/**
 * "Preview" and "Download PDF" side by side, with the preview dialog they
 * share. Each takes half the row on phones; natural width from `sm` up.
 * Renders nothing when the document is not offered.
 */
export function PdfDocumentActions({ pdf, previewTitle }: Props) {
  if (!pdf.enabled) return null;
  const half = { flex: { xs: 1, sm: '0 0 auto' } };

  return (
    <Box sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          onClick={() => void pdf.openPreview()}
          disabled={pdf.busy !== null}
          startIcon={
            pdf.busy === 'preview' ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <VisibilityOutlinedIcon />
            )
          }
          sx={{ ...half, whiteSpace: 'nowrap' }}
        >
          Preview
        </Button>
        <PdfDownloadButton
          onClick={() => void pdf.download()}
          busy={pdf.busy === 'download'}
          sx={half}
        />
      </Stack>
      {pdf.error && !pdf.previewOpen && (
        <Alert severity="error" onClose={pdf.clearError} sx={{ mt: 1 }}>
          {pdf.error}
        </Alert>
      )}
      <PdfPreviewDialog pdf={pdf} title={previewTitle} />
    </Box>
  );
}
