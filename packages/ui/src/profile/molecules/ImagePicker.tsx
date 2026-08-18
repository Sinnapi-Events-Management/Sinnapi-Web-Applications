'use client';
import { useCallback, useRef, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileUploadIcon from '@mui/icons-material/FileUploadOutlined';
import { PROFILE_IMAGE_ACCEPT } from '../schema';

export type ImagePickerProps = {
  /** Currently stored image, or the in-flight local preview. */
  src: string | null;
  /** Seeds the fallback initial when there's no image. */
  name: string;
  busy?: boolean;
  maxSizeMb: number;
  /** Circular reads as a person, rounded as a business. */
  shape?: 'circle' | 'rounded';
  /** Edge length in px. */
  size?: number;
  /** What the picker is for, e.g. `profile photo` or `business logo`. */
  subject?: string;
  /** Overrides the generated format/size caption. Pass null to omit it. */
  helperText?: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

/**
 * An image with pick / drop / remove affordances — the one upload control behind
 * every avatar and logo in the portals.
 *
 * Three routes to the same action, because people reach for different ones: click
 * the picture, click the button, or drag a file onto it. The picture is a real
 * `<button>` with a hidden file input behind it rather than a clickable `div`, so
 * it stays keyboard-reachable and screen-reader-legible, and the explicit button is
 * kept alongside because neither the tap-the-picture nor the drag affordance is
 * discoverable on its own.
 *
 * Drag-and-drop is deliberately additive: it is a convenience for pointer users on
 * a desktop and never the only way in, so nothing is lost on a phone or to someone
 * navigating by keyboard.
 */
export function ImagePicker({
  src,
  name,
  busy = false,
  maxSizeMb,
  shape = 'circle',
  size = 112,
  subject = 'profile photo',
  helperText,
  onSelect,
  onRemove,
}: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const radius = shape === 'circle' ? '50%' : 3;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset first so re-picking the same file still fires a change event.
    e.target.value = '';
    if (file) onSelect(file);
  }

  // `dragOver` must be prevented on every tick or the browser navigates to the
  // dropped file instead of handing it over.
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!busy) setDragging(true);
    },
    [busy],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (busy) return;
      // Only the first file: this is one picture, and silently uploading the last
      // of a multi-file drop would be a coin toss the user didn't ask to play.
      const file = e.dataTransfer.files?.[0];
      if (file) onSelect(file);
    },
    [busy, onSelect],
  );

  return (
    <Stack alignItems="center" spacing={2}>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{ position: 'relative' }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={`Change ${subject}`}
          sx={{
            p: 0,
            border: 0,
            borderRadius: radius,
            background: 'none',
            cursor: busy ? 'default' : 'pointer',
            display: 'block',
            transition: 'transform .15s',
            '&:hover': { transform: busy ? 'none' : 'scale(1.02)' },
            '&:hover .image-picker-overlay': { opacity: busy ? 0 : 1 },
            '&:focus-visible': {
              outline: (t) => `2px solid ${t.palette.primary.main}`,
              outlineOffset: 3,
            },
          }}
        >
          <Avatar
            src={src ?? undefined}
            alt={src ? `${name} — ${subject}` : undefined}
            variant={shape === 'circle' ? 'circular' : 'rounded'}
            sx={{
              width: size,
              height: size,
              borderRadius: radius,
              fontSize: Math.round(size * 0.36),
              fontWeight: 600,
              border: (t) => `3px solid ${t.palette.background.paper}`,
              boxShadow: (t) => `0 0 0 1px ${t.palette.divider}`,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>

          {/* One overlay for two states: the camera glyph on hover, and a stronger
              drop affordance while a file is over the target. */}
          <Box
            className="image-picker-overlay"
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: radius,
              display: 'grid',
              placeItems: 'center',
              color: 'common.white',
              bgcolor: (t) => alpha(t.palette.common.black, dragging ? 0.6 : 0.45),
              opacity: dragging ? 1 : 0,
              transition: 'opacity .15s',
              pointerEvents: 'none',
            }}
          >
            {dragging ? <FileUploadIcon /> : <PhotoCameraIcon />}
          </Box>
        </Box>

        {/* Dashed ring while dragging — reads as "this is the target" from further
            away than a tint inside the circle does. */}
        {dragging && !busy && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: -8,
              borderRadius: shape === 'circle' ? '50%' : 4,
              border: (t) => `2px dashed ${t.palette.primary.main}`,
              pointerEvents: 'none',
            }}
          />
        )}

        {busy && (
          <CircularProgress
            size={size + 10}
            thickness={2}
            sx={{ position: 'absolute', top: -5, left: -5 }}
          />
        )}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        onChange={handleChange}
        hidden
        // The visible button above carries the accessible name; hiding this from
        // the a11y tree stops screen readers announcing an unlabelled duplicate.
        aria-hidden
        tabIndex={-1}
      />

      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {src ? 'Change' : 'Upload'}
        </Button>
        {src && (
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRemove}
            disabled={busy}
            aria-label={`Remove ${subject}`}
          >
            Remove
          </Button>
        )}
      </Stack>

      {helperText !== null && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {helperText ??
            `Drag an image here, or browse. JPG, PNG, WebP or AVIF up to ${maxSizeMb} MB.`}
        </Typography>
      )}
    </Stack>
  );
}
