'use client';
import type { ReactNode } from 'react';
import { ImageList, ImageListItem, useMediaQuery, useTheme } from '@mui/material';
import { MediaTile } from './MediaTile';
import type { MediaRecord, PlayableMedia } from '../types';

export type MediaGridProps<T extends MediaRecord> = {
  items: PlayableMedia<T>[];
  fallbackAlt: string;
  onOpen: (index: number) => void;
  /** Hover/focus controls for one tile — the vendor portal's card actions. */
  renderOverlay?: (item: PlayableMedia<T>, index: number) => ReactNode;
  /** A corner marker for one tile, e.g. the cover badge. */
  renderBadge?: (item: PlayableMedia<T>, index: number) => ReactNode;
  /** Wraps a tile — used to make it a drag handle without this kit knowing how. */
  renderWrapper?: (item: PlayableMedia<T>, index: number, tile: ReactNode) => ReactNode;
};

/**
 * A media collection as a masonry grid.
 *
 * Masonry keeps each shot at its true aspect ratio — cropping a portfolio to
 * uniform squares is exactly the wrong call for this content, and it is the same
 * layout the public vendor page uses, so a visitor arriving from the marketing
 * site sees the work laid out the way its owner arranged it.
 *
 * Column count steps with the breakpoint rather than with `cols` alone, because
 * masonry columns don't reflow on their own: one column on a phone, two on a
 * tablet, three from `md` up.
 */
export function MediaGrid<T extends MediaRecord>({
  items,
  fallbackAlt,
  onOpen,
  renderOverlay,
  renderBadge,
  renderWrapper,
}: MediaGridProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const columns = isMobile ? 1 : isTablet ? 2 : 3;

  return (
    <ImageList variant="masonry" cols={columns} gap={12} sx={{ m: 0, overflow: 'visible' }}>
      {items.map((item, index) => {
        const tile = (
          <MediaTile
            item={item}
            fallbackAlt={fallbackAlt}
            onOpen={() => onOpen(index)}
            overlay={renderOverlay?.(item, index)}
            badge={renderBadge?.(item, index)}
          />
        );
        return (
          <ImageListItem key={item.id}>
            {renderWrapper ? renderWrapper(item, index, tile) : tile}
          </ImageListItem>
        );
      })}
    </ImageList>
  );
}
