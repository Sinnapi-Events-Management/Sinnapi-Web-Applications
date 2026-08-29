'use client';
import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography, alpha } from '@mui/material';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { MediaPlayBadge } from '../atoms/MediaPlayBadge';
import { posterUrl, isVideoSource } from '../schema/mediaSource';
import type { MediaRecord, PlayableMedia } from '../types';

export type MediaTileProps<T extends MediaRecord> = {
  item: PlayableMedia<T>;
  /** Names the owner when an item has no caption of its own. */
  fallbackAlt: string;
  onOpen: () => void;
  /**
   * Controls layered above the image — the vendor portal's delete and
   * set-as-cover, say. Rendered outside the ButtonBase so its own buttons are
   * real buttons rather than nested interactive content.
   */
  overlay?: ReactNode;
  /** A corner marker, e.g. "Cover". Also rendered outside the ButtonBase. */
  badge?: ReactNode;
};

/**
 * One clickable item in a media grid.
 *
 * Videos are the awkward case: `vendor_media` stores no poster frame, so each
 * source gets the best still it can offer — YouTube's published thumbnail for an
 * embed, the first frame for a direct file (`preload="metadata"` fetches the
 * header only, not the whole clip), and a neutral placeholder for anything else.
 * A play badge marks all three so the grid never implies a still image.
 *
 * The tile is a button, and `overlay`/`badge` sit as siblings of it rather than
 * children: an action button nested inside a button is invalid, and a screen
 * reader given one reads a single ambiguous control instead of two clear ones.
 */
export function MediaTile<T extends MediaRecord>({
  item,
  fallbackAlt,
  onOpen,
  overlay,
  badge,
}: MediaTileProps<T>) {
  const label = item.caption ?? fallbackAlt;
  const poster = posterUrl(item.source);
  const isVideo = isVideoSource(item.source);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'action.hover',
        // The overlay fades in on hover on a pointer device, and stays put once
        // anything inside the tile takes keyboard focus.
        '&:hover .media-tile-overlay, &:focus-within .media-tile-overlay': { opacity: 1 },
      }}
    >
      <ButtonBase
        onClick={onOpen}
        focusRipple
        aria-label={isVideo ? `Play ${label}` : `View ${label}`}
        sx={{
          display: 'block',
          width: '100%',
          '& .media-tile-visual': {
            transition: 'transform .5s ease',
            display: 'block',
            width: '100%',
          },
          '&:hover .media-tile-visual, &:focus-visible .media-tile-visual': {
            transform: 'scale(1.06)',
          },
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex' }}>
          {poster ? (
            <Box
              component="img"
              className="media-tile-visual"
              src={poster}
              alt={label}
              loading="lazy"
              sx={{ objectFit: 'cover' }}
            />
          ) : item.source.kind === 'video-file' ? (
            <Box
              component="video"
              className="media-tile-visual"
              // The `#t=0.1` fragment nudges playback past 0s so browsers that
              // won't paint the very first frame still show a real one rather
              // than a black rectangle; `preload="metadata"` fetches only the
              // header, not the clip.
              src={`${item.source.src}#t=0.1`}
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <PlaceholderVisual label={label} />
          )}

          {isVideo && <MediaPlayBadge />}

          {item.caption && (
            <Box
              sx={{
                position: 'absolute',
                inset: 'auto 0 0 0',
                px: 1.5,
                py: 1,
                background: (t) =>
                  `linear-gradient(to top, ${alpha(t.palette.common.black, 0.72)}, transparent)`,
              }}
            >
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'common.white', display: 'block', textAlign: 'left' }}
              >
                {item.caption}
              </Typography>
            </Box>
          )}
        </Box>
      </ButtonBase>

      {badge && <Box sx={{ position: 'absolute', top: 8, left: 8 }}>{badge}</Box>}
      {overlay}
    </Box>
  );
}

/** Stand-in for a video whose host publishes no thumbnail we can read. */
function PlaceholderVisual({ label }: { label: string }) {
  return (
    <Box
      className="media-tile-visual"
      sx={{
        height: 200,
        display: 'grid',
        placeItems: 'center',
        gap: 1,
        px: 2,
        bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
        color: 'text.secondary',
      }}
    >
      <MovieOutlinedIcon sx={{ fontSize: 40 }} />
      <Typography variant="caption" noWrap sx={{ maxWidth: '100%' }}>
        {label}
      </Typography>
    </Box>
  );
}
