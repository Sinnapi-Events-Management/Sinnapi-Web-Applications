'use client';
import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Whether this browser can show a PDF inside the page.
 *
 * Desktop browsers can (`navigator.pdfViewerEnabled`). Phones mostly cannot:
 * Android Chrome downloads the file instead of drawing it, and iOS shows one
 * page that will not scroll. On a phone the preview therefore hands the file
 * to the device's own PDF viewer, which is the better reader there anyway.
 */
export function useInlinePdfSupport(): boolean {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const viewer =
    typeof navigator === 'undefined' ||
    (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
  return viewer && !isPhone;
}
