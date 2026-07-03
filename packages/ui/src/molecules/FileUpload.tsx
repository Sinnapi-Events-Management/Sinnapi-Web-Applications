'use client';
import { useRef, useState, type ReactNode } from 'react';
import { Box, Typography, LinearProgress, IconButton, alpha } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';

export type UploadedFile = {
  /** Stable id (e.g. crypto.randomUUID()) assigned by the parent. */
  id: string;
  name: string;
  size?: number;
  /** Preview/served URL once available (image items render a thumbnail). */
  url?: string;
  status: 'uploading' | 'done' | 'error';
  /** 0–100 while `status === 'uploading'`. */
  progress?: number;
  error?: string;
};

export type FileUploadProps = {
  label?: string;
  hint?: string;
  /** Native input `accept` (e.g. "image/*,application/pdf"). */
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  disabled?: boolean;
  /** Controlled list of items; the parent owns upload + status. */
  value: UploadedFile[];
  /** Fires with the accepted File(s); the parent performs the actual upload. */
  onSelect: (files: File[]) => void;
  onRemove: (id: string) => void;
  /** Field-level error (e.g. "Required"). */
  error?: string;
  /** Optional custom dropzone icon. */
  icon?: ReactNode;
};

function isImage(item: UploadedFile): boolean {
  return (
    /\.(jpe?g|png|webp|avif|gif)$/i.test(item.name) || Boolean(item.url && /image/i.test(item.url))
  );
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Presentational drag-and-drop file field. Owns dragover state, click-to-browse,
 * and client-side size validation, then hands accepted File(s) to `onSelect`;
 * the consumer performs the upload and feeds progress/status back through
 * `value`. App-agnostic (no storage coupling) so any app can reuse it.
 */
export function FileUpload({
  label,
  hint,
  accept,
  multiple = false,
  maxSizeMb,
  disabled,
  value,
  onSelect,
  onRemove,
  error,
  icon,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const tooBig = maxSizeMb
      ? files.filter((f) => f.size > maxSizeMb * 1024 * 1024).map((f) => f.name)
      : [];
    const ok = maxSizeMb ? files.filter((f) => f.size <= maxSizeMb * 1024 * 1024) : files;
    setLocalError(tooBig.length ? `${tooBig.join(', ')} exceeds the ${maxSizeMb} MB limit` : null);
    if (ok.length) onSelect(multiple ? ok : [ok[0]]);
  }

  const shownError = error ?? localError;

  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.75 }}>
          {label}
        </Typography>
      )}

      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          borderRadius: 2,
          border: '1.5px dashed',
          borderColor: shownError ? 'error.main' : dragging ? 'primary.main' : 'divider',
          bgcolor: (t) => (dragging ? alpha(t.palette.primary.main, 0.06) : 'background.paper'),
          color: 'text.secondary',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color .15s ease, background-color .15s ease',
          '&:hover': { borderColor: disabled ? 'divider' : 'primary.main' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
          },
        }}
      >
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon ?? <CloudUploadIcon />}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Drag &amp; drop or{' '}
            <Box component="span" sx={{ color: 'primary.main' }}>
              browse
            </Box>
          </Typography>
          {hint && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
              {hint}
            </Typography>
          )}
        </Box>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </Box>

      {shownError && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
          {shownError}
        </Typography>
      )}

      {value.length > 0 && (
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {value.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1,
                pr: 0.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: item.status === 'error' ? 'error.light' : 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                  color: 'primary.main',
                }}
              >
                {isImage(item) && item.url ? (
                  <Box
                    component="img"
                    src={item.url}
                    alt=""
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <InsertDriveFileIcon fontSize="small" />
                )}
              </Box>

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {item.name}
                </Typography>
                {item.status === 'uploading' ? (
                  <LinearProgress
                    variant={item.progress != null ? 'determinate' : 'indeterminate'}
                    value={item.progress}
                    sx={{ mt: 0.5, borderRadius: 1 }}
                  />
                ) : (
                  <Typography
                    variant="caption"
                    color={item.status === 'error' ? 'error' : 'text.secondary'}
                  >
                    {item.status === 'error'
                      ? (item.error ?? 'Upload failed')
                      : formatSize(item.size)}
                  </Typography>
                )}
              </Box>

              {item.status === 'done' && <CheckCircleIcon fontSize="small" color="success" />}
              {item.status === 'error' && <ErrorOutlineIcon fontSize="small" color="error" />}

              <IconButton
                size="small"
                aria-label={`Remove ${item.name}`}
                disabled={disabled}
                onClick={() => onRemove(item.id)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
