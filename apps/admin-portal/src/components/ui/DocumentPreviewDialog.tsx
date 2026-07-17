import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Dialog,
  DialogContent,
  Box,
  Stack,
  Typography,
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
  Divider,
  alpha,
} from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import type { DocKind, PreviewDoc } from './documentPreview';

// pdf.js runs its parser in a web worker. `?url` lets Vite fingerprint and serve
// the worker asset correctly in both dev and production builds.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const KIND_ICON: Record<DocKind, React.ReactNode> = {
  image: <ImageIcon />,
  pdf: <DescriptionIcon />,
  other: <InsertDriveFileIcon />,
};

type Props = {
  doc: PreviewDoc | null;
  loading?: boolean;
  onClose: () => void;
};

/**
 * Modern in-app document viewer. Renders images inline and PDFs page-by-page
 * (react-pdf) without ever leaving the page, and lets the reviewer download the
 * original. Used for the verification docs on the application detail screen, but
 * kept generic so any private-bucket document can reuse it.
 */
export default function DocumentPreviewDialog({ doc, loading = false, onClose }: Props) {
  const open = doc !== null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { height: { xs: '100%', sm: '88vh' }, borderRadius: { sm: 3 } } }}
      sx={{ backdropFilter: 'blur(5px)' }}
    >
      {doc && <PreviewHeader doc={doc} onClose={onClose} />}
      <Divider />
      <DialogContent
        sx={{
          p: 0,
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? alpha('#000', 0.4) : alpha(t.palette.grey[500], 0.12),
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading || !doc?.url ? (
          <Centered>
            <CircularProgress />
          </Centered>
        ) : doc.kind === 'image' ? (
          <ImagePreview doc={doc} />
        ) : doc.kind === 'pdf' ? (
          <PdfPreview doc={doc} />
        ) : (
          <UnsupportedPreview doc={doc} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewHeader({ doc, onClose }: { doc: PreviewDoc; onClose: () => void }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 1.75 }}>
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 40,
          height: 40,
          borderRadius: 2,
          color: 'secondary.main',
          bgcolor: (t) => alpha(t.palette.secondary.main, 0.12),
        }}
      >
        {KIND_ICON[doc.kind]}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          {doc.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {doc.fileName}
        </Typography>
      </Box>
      <DownloadButton doc={doc} />
      <Tooltip title="Close">
        <IconButton onClick={onClose} aria-label="Close preview">
          <CloseIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function DownloadButton({ doc }: { doc: PreviewDoc }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    if (!doc.url) return;
    setBusy(true);
    try {
      // Fetch the signed URL as a blob so the browser saves it with a real
      // filename instead of navigating away to the storage host.
      const res = await fetch(doc.url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      onClick={download}
      disabled={busy || !doc.url}
      variant="contained"
      size="small"
      startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
    >
      Download
    </Button>
  );
}

function ImagePreview({ doc }: { doc: PreviewDoc }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <UnsupportedPreview doc={doc} note="This image can't be shown in-browser." />;
  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Box
        component="img"
        src={doc.url}
        alt={doc.title}
        onError={() => setFailed(true)}
        sx={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          borderRadius: 1.5,
          boxShadow: 3,
          bgcolor: 'background.paper',
        }}
      />
    </Box>
  );
}

function PdfPreview({ doc }: { doc: PreviewDoc }) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState<number>();
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fit the page to the container width so it looks good on any viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth - 48);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (failed) return <UnsupportedPreview doc={doc} note="This PDF couldn't be rendered." />;

  return (
    <>
      <Box ref={containerRef} sx={{ flex: 1, overflow: 'auto', p: 3, textAlign: 'center' }}>
        <Document
          file={doc.url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={() => setFailed(true)}
          loading={
            <Centered>
              <CircularProgress />
            </Centered>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            scale={scale}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={
              <Centered>
                <CircularProgress size={28} />
              </Centered>
            }
          />
        </Document>
      </Box>
      <Divider />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
        sx={{ py: 1, bgcolor: 'background.paper' }}
      >
        <IconButton
          size="small"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 88, textAlign: 'center' }}>
          Page {pageNumber} / {numPages || '—'}
        </Typography>
        <IconButton
          size="small"
          disabled={numPages !== 0 && pageNumber >= numPages}
          onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </IconButton>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        <IconButton
          size="small"
          disabled={scale <= 0.5}
          onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
          aria-label="Zoom out"
        >
          <ZoomOutIcon />
        </IconButton>
        <Typography variant="body2" sx={{ minWidth: 44, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </Typography>
        <IconButton
          size="small"
          disabled={scale >= 3}
          onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
          aria-label="Zoom in"
        >
          <ZoomInIcon />
        </IconButton>
      </Stack>
    </>
  );
}

function UnsupportedPreview({ doc, note }: { doc: PreviewDoc; note?: string }) {
  return (
    <Centered>
      <Stack spacing={2} alignItems="center" sx={{ p: 4, textAlign: 'center' }}>
        <BrokenImageIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Box>
          <Typography variant="h6">Preview unavailable</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {note ?? 'This file type can’t be previewed here.'} Download it to view.
          </Typography>
        </Box>
        <DownloadButton doc={doc} />
      </Stack>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 240 }}>{children}</Box>
  );
}
