'use client';
import type { ReactNode } from 'react';
import { Box, ButtonBase, Stack, Typography, alpha } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined';

export type CoverImageWellProps = {
  /** The URL to paint, or null for the empty state. */
  src: string | null;
  /** Alternative text. Empty for a purely decorative cover. */
  alt?: string;
  /** `width / height` of the band, matching wherever the cover is published. */
  ratio: number;
  /** True while an upload is in flight — dims the band and blocks the picker. */
  busy?: boolean;
  /** True when every candidate URL failed to load. */
  broken?: boolean;
  /** What the empty band invites the vendor to do. */
  emptyLabel: string;
  /** Opens the file picker. The whole empty band is the target, not just a button. */
  onPick: () => void;
  /** Fired when `src` will not decode, so the caller can try the next one. */
  onError?: () => void;
  /** Controls layered on the image — the remove button, a progress bar. */
  overlay?: ReactNode;
};

/**
 * The band a cover image occupies, at the exact ratio it is published in.
 *
 * WHY THE IMAGE IS POSITIONED, NOT SIZED
 * The obvious spelling — a flex-centred `<img>` at `width: 100%; height: 100%`
 * inside an `aspect-ratio` box — asks the browser to resolve a percentage
 * height against a containing block whose own height is only implied by its
 * ratio. Where that resolution goes to `auto` the image keeps its intrinsic
 * shape and spills or shrinks; the failures are silent and differ by engine.
 * `position: absolute; inset: 0` takes the question off the table: the image is
 * laid out against the band's padding box, which the ratio has already fixed.
 *
 * The empty band is a `ButtonBase` rather than a labelled area with a button
 * under it. It is the largest, most obvious target on the field and a vendor
 * will click it whether or not it was built to be clicked — and as a real
 * button it also reaches the keyboard, which a click handler on a `Box` would
 * not.
 */
export function CoverImageWell({
  src,
  alt = '',
  ratio,
  busy = false,
  broken = false,
  emptyLabel,
  onPick,
  onError,
  overlay,
}: CoverImageWellProps) {
  return (
    <Box
      aria-busy={busy || undefined}
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${ratio}`,
        borderRadius: 2,
        overflow: 'hidden',
        // Dashed while there is nothing to frame, solid once there is: the
        // border is telling the vendor whether the slot is still asking for
        // something, so it stops asking as soon as it has an answer.
        border: (t) => `1px ${src ? 'solid' : 'dashed'} ${t.palette.divider}`,
        // Tinted from the foreground rather than a fixed grey, so the empty
        // well reads as a recessed surface on both the light and the warm dark
        // canvas instead of a hole in one of them.
        bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.08 : 0.03),
        transition: (t) => t.transitions.create('opacity'),
        opacity: busy ? 0.62 : 1,
      }}
    >
      {src ? (
        <Box
          // Keyed on the URL so swapping sources remounts the element: a
          // browser does not re-fire `error` for a src it has already given up
          // on, and a stale failed state must not follow the new one in.
          key={src}
          component="img"
          src={src}
          alt={alt}
          onError={onError}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <ButtonBase
          onClick={onPick}
          disabled={busy}
          focusRipple
          sx={{
            position: 'absolute',
            inset: 0,
            flexDirection: 'column',
            color: 'text.secondary',
            '&:hover': {
              bgcolor: (t) =>
                alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.06 : 0.02),
            },
          }}
        >
          <Stack alignItems="center" spacing={0.75} sx={{ px: 2, textAlign: 'center' }}>
            {broken ? (
              <BrokenImageOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
            ) : (
              <ImageOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
            )}
            <Typography variant="caption">
              {broken ? "That image couldn't be displayed. Try another." : emptyLabel}
            </Typography>
          </Stack>
        </ButtonBase>
      )}

      {overlay}
    </Box>
  );
}
