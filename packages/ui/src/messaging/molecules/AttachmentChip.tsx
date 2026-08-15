'use client';
import { useState } from 'react';
import { Box, Stack, Typography, CircularProgress, Tooltip, alpha } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import DangerousIcon from '@mui/icons-material/Dangerous';
import { formatFileSize } from '../format';
import type { MessageAttachmentView } from '../types';

export type AttachmentChipProps = {
  attachment: MessageAttachmentView;
  /**
   * Resolves a short-lived signed URL. Called on click rather than on render:
   * the bucket is private, a thread can hold dozens of attachments, and minting
   * a URL for every one on mount both wastes requests and starts the expiry
   * clock on files nobody opened.
   */
  onOpen?: (attachment: MessageAttachmentView) => Promise<void>;
  /** Renders on the sender's side of the thread. */
  mine?: boolean;
};

function iconFor(mime: string | null) {
  if (!mime) return InsertDriveFileIcon;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime === 'application/pdf') return PictureAsPdfIcon;
  if (mime.startsWith('text/') || mime.includes('word') || mime.includes('sheet'))
    return DescriptionIcon;
  return InsertDriveFileIcon;
}

/**
 * One file on a message.
 *
 * `scan_status` is surfaced rather than hidden. Nothing scans these yet, so
 * every attachment sits at `pending` — and a UI that silently presents an
 * unscanned file as safe is making a promise the platform has not kept. The
 * chip stays openable, with the state stated plainly.
 *
 * An `infected` attachment is not openable at all: at that point the click is
 * the entire attack.
 */
export function AttachmentChip({ attachment, onOpen, mine = false }: AttachmentChipProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const infected = attachment.scanStatus === 'infected';
  const unscanned = attachment.scanStatus === 'pending';
  const Icon = infected ? DangerousIcon : iconFor(attachment.mimeType);
  const disabled = infected || !onOpen;

  async function open() {
    if (disabled || busy) return;
    setBusy(true);
    setError(false);
    try {
      await onOpen!(attachment);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const size = formatFileSize(attachment.sizeBytes);

  return (
    <Stack
      component={disabled ? 'div' : 'button'}
      type={disabled ? undefined : 'button'}
      onClick={open}
      disabled={disabled || busy}
      direction="row"
      spacing={1}
      alignItems="center"
      aria-label={
        infected
          ? `${attachment.fileName} — blocked, this file failed a security scan`
          : `Download ${attachment.fileName}`
      }
      sx={{
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        p: 1,
        borderRadius: 1.5,
        border: 1,
        borderColor: infected ? 'error.main' : 'divider',
        bgcolor: (t) =>
          infected
            ? alpha(t.palette.error.main, 0.08)
            : alpha(t.palette.text.primary, mine ? 0.08 : 0.04),
        cursor: disabled ? 'default' : 'pointer',
        '&:hover': disabled ? undefined : { borderColor: 'primary.main' },
      }}
    >
      <Icon
        sx={{ fontSize: 20, color: infected ? 'error.main' : 'text.secondary', flexShrink: 0 }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {attachment.fileName}
        </Typography>
        <Typography variant="caption" color={error ? 'error.main' : 'text.secondary'}>
          {error
            ? 'Could not open — try again'
            : infected
              ? 'Blocked by security scan'
              : [size, unscanned ? 'not yet scanned' : null].filter(Boolean).join(' · ')}
        </Typography>
      </Box>

      {busy ? (
        <CircularProgress size={16} />
      ) : unscanned && !infected ? (
        <Tooltip title="This file has not been scanned yet. Open only if you trust the sender.">
          <GppMaybeIcon sx={{ fontSize: 18, color: 'warning.main', flexShrink: 0 }} />
        </Tooltip>
      ) : (
        !disabled && <DownloadIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
      )}
    </Stack>
  );
}
