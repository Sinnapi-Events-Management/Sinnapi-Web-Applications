'use client';
import { useEffect, useRef } from 'react';
import { Box, ButtonBase, alpha } from '@mui/material';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { MediaPlayBadge } from '../atoms/MediaPlayBadge';
import { posterUrl, isVideoSource } from '../schema/mediaSource';
import type { MediaRecord, PlayableMedia } from '../types';

export type MediaThumbStripProps<T extends MediaRecord> = {
  items: PlayableMedia<T>[];
  activeIndex: number;
  onSelect: (index: number) => void;
  fallbackAlt: string;
};

const THUMB_WIDTH = 92;
const THUMB_HEIGHT = 62;

/**
 * The filmstrip along the bottom of the viewer: every item at a glance, and a
 * one-click jump to any of them.
 *
 * It scrolls horizontally rather than wrapping, because the viewer's height is
 * the scarce dimension — a strip that grew to three rows would push the media
 * itself off screen. Whenever the active item changes, by arrow key or by click,
 * its thumbnail is scrolled to the centre, so stepping past the visible end of
 * the strip keeps the position marker in view instead of stranding it.
 *
 * Rendered on the viewer's own dark surface, so its colours are fixed rather
 * than themed — see `MediaNavButton` for why.
 */
export function MediaThumbStrip<T extends MediaRecord>({
  items,
  activeIndex,
  onSelect,
  fallbackAlt,
}: MediaThumbStripProps<T>) {
  const stripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    // `nearest` on the block axis keeps this from scrolling the page vertically
    // while it centres the thumbnail horizontally.
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeIndex]);

  return (
    <Box
      ref={stripRef}
      role="tablist"
      aria-label="Portfolio items"
      sx={{
        display: 'flex',
        gap: 1,
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        overflowX: 'auto',
        borderTop: (t) => `1px solid ${alpha(t.palette.common.white, 0.12)}`,
        // A visible scrollbar on a dark translucent bar reads as damage; the
        // strip is navigable by arrow keys and by dragging regardless.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const label = item.caption ?? fallbackAlt;
        const poster = posterUrl(item.source);

        return (
          <ButtonBase
            key={item.id}
            data-index={index}
            role="tab"
            aria-selected={isActive}
            aria-label={`Show ${label}`}
            onClick={() => onSelect(index)}
            sx={{
              position: 'relative',
              flex: '0 0 auto',
              width: THUMB_WIDTH,
              height: THUMB_HEIGHT,
              borderRadius: 1.5,
              overflow: 'hidden',
              bgcolor: (t) => alpha(t.palette.common.white, 0.08),
              outline: (t) =>
                isActive
                  ? `2px solid ${t.palette.primary.main}`
                  : `1px solid ${alpha(t.palette.common.white, 0.2)}`,
              outlineOffset: isActive ? -2 : -1,
              opacity: isActive ? 1 : 0.55,
              transition: 'opacity .2s ease',
              '&:hover, &:focus-visible': { opacity: 1 },
            }}
          >
            {poster ? (
              <Box
                component="img"
                src={poster}
                alt=""
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : item.source.kind === 'video-file' ? (
              <Box
                component="video"
                src={`${item.source.src}#t=0.1`}
                preload="metadata"
                muted
                playsInline
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box sx={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%' }}>
                <MovieOutlinedIcon sx={{ fontSize: 20, color: 'common.white', opacity: 0.7 }} />
              </Box>
            )}

            {isVideoSource(item.source) && poster && <MediaPlayBadge size="small" />}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
