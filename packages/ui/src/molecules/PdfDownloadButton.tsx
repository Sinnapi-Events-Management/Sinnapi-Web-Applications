'use client';
import { Button, CircularProgress, type ButtonProps } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';

export type PdfDownloadButtonProps = {
  onClick: () => void;
  busy?: boolean;
  /** Defaults to "Download PDF". */
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  /** Stretch to the row on phones, where a lone button reads as a target. */
  fullWidthOnMobile?: boolean;
  sx?: ButtonProps['sx'];
};

/**
 * The one "Download PDF" button for documents built in the browser —
 * quotations today. Shows a spinner while the file is prepared (the vendor's
 * logo is fetched first), and its label says so for screen readers.
 */
export function PdfDownloadButton({
  onClick,
  busy = false,
  label = 'Download PDF',
  variant = 'outlined',
  size = 'medium',
  fullWidthOnMobile = false,
  sx,
}: PdfDownloadButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      startIcon={
        busy ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />
      }
      sx={[
        {
          whiteSpace: 'nowrap',
          ...(fullWidthOnMobile ? { width: { xs: '100%', sm: 'auto' } } : {}),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {busy ? 'Preparing PDF…' : label}
    </Button>
  );
}
