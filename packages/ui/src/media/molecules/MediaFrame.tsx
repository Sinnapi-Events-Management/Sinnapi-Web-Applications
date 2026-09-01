'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { MediaRecord, PlayableMedia } from '../types';

export type MediaFrameProps<T extends MediaRecord> = {
  item: PlayableMedia<T>;
  /** Stands in for a caption-less item — usually the vendor's name. */
  fallbackAlt: string;
  /**
   * Ceiling for the media's height. Lower it when the viewer shows a thumbnail
   * strip underneath, so frame + strip together still fit one screen.
   */
  maxHeight?: string;
};

/**
 * Renders whichever of the four shapes an item resolved to, sized to fit the
 * viewport rather than its own dimensions — a portrait photo and a 16:9 clip both
 * stay fully visible without the dialog growing a scrollbar.
 */
export function MediaFrame<T extends MediaRecord>({
  item,
  fallbackAlt,
  maxHeight = '78vh',
}: MediaFrameProps<T>) {
  const label = item.caption ?? fallbackAlt;
  const { source } = item;

  if (source.kind === 'image') {
    return (
      <Box
        component="img"
        src={source.src}
        alt={label}
        sx={{ maxWidth: '100%', maxHeight, objectFit: 'contain', display: 'block' }}
      />
    );
  }

  if (source.kind === 'video-file') {
    return (
      <Box
        component="video"
        // Keyed on the URL so switching items tears down the old element rather
        // than swapping the source underneath a player that is already playing.
        key={source.src}
        src={source.src}
        controls
        autoPlay
        playsInline
        sx={{ maxWidth: '100%', maxHeight, display: 'block', outline: 'none' }}
      />
    );
  }

  if (source.kind === 'video-embed') {
    return (
      <Box
        sx={{
          width: '100%',
          // 16:9 at `maxHeight` tall — keeps the frame from overflowing the
          // dialog on a short, wide window.
          maxWidth: `min(100%, calc(${maxHeight} * 16 / 9))`,
          aspectRatio: '16 / 9',
          bgcolor: 'common.black',
        }}
      >
        <Box
          component="iframe"
          key={source.src}
          src={source.src}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          // The player is third-party: sandboxed to scripts and same-origin so
          // it can run, but not navigate the page hosting it.
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </Box>
    );
  }

  return (
    <Stack spacing={2} alignItems="center" sx={{ p: 6, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ color: 'common.white' }}>
        This item can’t be played here
      </Typography>
      <Typography variant="body2" sx={{ color: 'grey.400' }}>
        {label}
      </Typography>
      <Button
        href={source.src}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        startIcon={<OpenInNewIcon />}
      >
        Open in a new tab
      </Button>
    </Stack>
  );
}
