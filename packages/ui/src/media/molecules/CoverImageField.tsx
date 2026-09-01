'use client';
import { useRef } from 'react';
import { Alert, Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { CoverImageWell } from '../atoms/CoverImageWell';
import { useCoverImageSource } from '../hooks/useCoverImageSource';

export type CoverImageFieldProps = {
  label: string;
  /** The one-line explanation under the label. */
  hint?: string;
  /** The committed URL — the form field's value — or ''. */
  value: string;
  /** A local object URL standing in while the upload is in flight. */
  preview?: string | null;
  busy?: boolean;
  error?: string | null;
  /** The `accept` list handed to the file input. */
  accept: string;
  /** `width / height` of the published band. Defaults to the 16:7 card cover. */
  ratio?: number;
  /** Decorative by default; name the image where it carries meaning. */
  alt?: string;
  emptyLabel?: string;
  uploadLabel?: string;
  replaceLabel?: string;
  /** Accessible name for the remove button. */
  removeLabel?: string;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
};

/**
 * One image, picked and cropped to the ratio it will be published at.
 *
 * Shared rather than written per feature, because package covers and promotion
 * banners had drifted into two near-identical copies of the same 140 lines —
 * which is how one of them ends up with a bug fix the other never gets, and how
 * two surfaces that a vendor experiences as "the picture on the card" come to
 * accept different files.
 *
 * Purely presentational: it holds no upload, no bucket and no client. It is
 * given a value, an optional in-flight preview and two callbacks, so the same
 * component works over any storage the calling app happens to use. What it does
 * own is the part that is easy to get wrong — which of the two URLs to paint,
 * what to do when one of them will not load, and how the band behaves in both
 * colour modes at every width.
 */
export function CoverImageField({
  label,
  hint,
  value,
  preview,
  busy = false,
  error,
  accept,
  ratio = 16 / 7,
  alt = '',
  emptyLabel = 'No image yet',
  uploadLabel = 'Upload image',
  replaceLabel = 'Replace image',
  removeLabel = 'Remove image',
  onPick,
  onClear,
  disabled = false,
}: CoverImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const { src, broken, onError } = useCoverImageSource(preview, value);

  const pick = () => {
    if (!busy && !disabled) input.current?.click();
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" display="block">
          {hint}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 1.5 }}>
        <CoverImageWell
          src={src}
          alt={alt}
          ratio={ratio}
          busy={busy}
          broken={broken}
          emptyLabel={emptyLabel}
          onPick={pick}
          onError={onError}
          overlay={
            <>
              {src && !disabled && (
                <IconButton
                  aria-label={removeLabel}
                  onClick={onClear}
                  disabled={busy}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    // A fixed dark scrim rather than a palette colour: this sits
                    // on an arbitrary photograph, where neither theme's surface
                    // offers a contrast guarantee.
                    bgcolor: 'rgba(0, 0, 0, 0.55)',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.72)' },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}

              {busy && (
                <LinearProgress
                  sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 }}
                />
              )}
            </>
          }
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          onClick={pick}
          disabled={busy || disabled}
          startIcon={<ImageOutlinedIcon />}
        >
          {busy ? 'Uploading…' : src ? replaceLabel : uploadLabel}
        </Button>
      </Stack>

      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so picking the same file again after a failure still fires.
          event.target.value = '';
          if (file) onPick(file);
        }}
      />
    </Box>
  );
}
