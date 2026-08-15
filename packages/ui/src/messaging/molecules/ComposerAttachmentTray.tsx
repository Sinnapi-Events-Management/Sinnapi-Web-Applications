'use client';
import { Box, Stack, Typography, IconButton, LinearProgress, alpha } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { formatFileSize } from '../format';

/** A file the user has picked but not yet sent. */
export type PendingAttachment = {
  /** Client-side id; the row has no database identity until the message sends. */
  id: string;
  file: File;
  /** Object URL for an image preview, released by the owning hook. */
  previewUrl?: string;
  /** 0–100 while uploading; absent once the upload settles. */
  progress?: number;
  error?: string | null;
};

export type ComposerAttachmentTrayProps = {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
};

/**
 * The staging strip above the composer.
 *
 * Images get a thumbnail and everything else gets a named tile, because the
 * failure this prevents is attaching the wrong photo — a filename like
 * `IMG_4821.jpg` is not something anyone can check, and the whole point of
 * staging before send is that the mistake is still recoverable.
 *
 * Uploads run while the user is still typing, so a file picked at the start of
 * a long message is already in the bucket by the time they hit send.
 */
export function ComposerAttachmentTray({ items, onRemove, disabled }: ComposerAttachmentTrayProps) {
  if (items.length === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        overflowX: 'auto',
        pb: 0.5,
        // The tray must never widen the composer; long file lists scroll.
        maxWidth: '100%',
      }}
    >
      {items.map((item) => {
        const uploading = item.progress != null && item.progress < 100;
        return (
          <Box
            key={item.id}
            sx={{
              position: 'relative',
              flexShrink: 0,
              width: 96,
              borderRadius: 1.5,
              border: 1,
              borderColor: item.error ? 'error.main' : 'divider',
              bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
              overflow: 'hidden',
            }}
          >
            {item.previewUrl ? (
              <Box
                component="img"
                src={item.previewUrl}
                alt={item.file.name}
                sx={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ height: 64 }}>
                <InsertDriveFileIcon sx={{ color: 'text.secondary' }} />
              </Stack>
            )}

            <Box sx={{ p: 0.75 }}>
              <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 500 }}>
                {item.file.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: item.error ? 'error.main' : 'text.secondary', fontSize: 10 }}
              >
                {item.error ?? formatFileSize(item.file.size)}
              </Typography>
            </Box>

            {uploading && (
              <LinearProgress
                variant="determinate"
                value={item.progress}
                sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 }}
              />
            )}

            <IconButton
              size="small"
              onClick={() => onRemove(item.id)}
              disabled={disabled}
              aria-label={`Remove ${item.file.name}`}
              sx={{
                position: 'absolute',
                top: 2,
                right: 2,
                p: 0.25,
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        );
      })}
    </Stack>
  );
}
