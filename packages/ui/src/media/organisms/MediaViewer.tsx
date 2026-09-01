'use client';
import type { KeyboardEvent, ReactNode } from 'react';
import { Box, Dialog, alpha, useMediaQuery, useTheme } from '@mui/material';
import { MediaNavButton } from '../atoms/MediaNavButton';
import { MediaFrame } from '../molecules/MediaFrame';
import { MediaThumbStrip } from '../molecules/MediaThumbStrip';
import { MediaViewerHeader } from '../molecules/MediaViewerHeader';
import type { MediaRecord, PlayableMedia } from '../types';

export type MediaViewerProps<T extends MediaRecord> = {
  /** The whole set, so the strip can offer every item. */
  items: PlayableMedia<T>[];
  /** The item on screen. `null` closes the dialog. */
  item: PlayableMedia<T> | null;
  /** Index of `item` within `items`; drives the strip's highlight. */
  index: number;
  position: number;
  count: number;
  /** False for a single-item set, where stepping and a strip are no-ops. */
  canStep: boolean;
  /** Names an item with no caption — usually the vendor's business name. */
  fallbackAlt: string;
  /** Owner actions for the item on screen, rendered in the title bar. */
  actions?: ReactNode;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (index: number) => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

/**
 * Full-bleed viewer for one item of a media set, with the rest of the set
 * reachable from its footer.
 *
 * The 4px-blurred scrim comes from the shared theme, so this dialog matches every
 * other modal in the platform — the same chrome as `ConfirmDialog` — without
 * restating it. The paper itself is near-black and transparent instead of a
 * panel: media should read as floating over the page, and a light card behind a
 * photo distorts how its colours look. That is also why it does not follow the
 * theme: a portfolio shot must look the same to the vendor who uploaded it and
 * the client who opens it, whichever mode either is in.
 *
 * Full screen below `sm`. A phone has no room to spare around a photo, and the
 * strip needs the full width to show more than two thumbnails.
 */
export function MediaViewer<T extends MediaRecord>({
  items,
  item,
  index,
  position,
  count,
  canStep,
  fallbackAlt,
  actions,
  onClose,
  onNext,
  onPrevious,
  onSelect,
  onKeyDown,
}: MediaViewerProps<T>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      onKeyDown={onKeyDown}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      aria-label="Media viewer"
      PaperProps={{
        sx: {
          bgcolor: (t) => alpha(t.palette.common.black, 0.82),
          backgroundImage: 'none',
          boxShadow: 'none',
          borderRadius: fullScreen ? 0 : 4,
          overflow: 'hidden',
        },
      }}
    >
      {item && (
        <>
          <MediaViewerHeader
            title={item.caption ?? fallbackAlt}
            counter={count > 1 ? `${position} of ${count}` : undefined}
            actions={actions}
            onClose={onClose}
          />

          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              p: { xs: 0, sm: 1 },
            }}
          >
            {/* Leaves room for the header and the strip, so all three fit one
                screen rather than the media pushing the strip out of view. */}
            <MediaFrame
              item={item}
              fallbackAlt={fallbackAlt}
              maxHeight={canStep ? '62vh' : '78vh'}
            />
            {canStep && (
              <>
                <MediaNavButton direction="previous" onClick={onPrevious} />
                <MediaNavButton direction="next" onClick={onNext} />
              </>
            )}
          </Box>

          {canStep && (
            <MediaThumbStrip
              items={items}
              activeIndex={index}
              onSelect={onSelect}
              fallbackAlt={fallbackAlt}
            />
          )}
        </>
      )}
    </Dialog>
  );
}
