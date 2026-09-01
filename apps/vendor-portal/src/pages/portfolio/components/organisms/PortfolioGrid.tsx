import type { ReactNode } from 'react';
import { Box } from '@sinnapi/ui';
import { MediaGrid, type PlayableMedia } from '@sinnapi/ui/media';
import type { MediaModel } from '@/lib/types';
import CoverBadge from '../atoms/CoverBadge';
import PortfolioTileActions from '../molecules/PortfolioTileActions';

type Props = {
  items: PlayableMedia<MediaModel>[];
  vendorName: string;
  canReorder: boolean;
  dragIndex: number | null;
  busyId: string | null;
  onOpen: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onSetCover: (item: MediaModel) => void;
  onRemove: (item: MediaModel) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
};

/**
 * The vendor's own view of their portfolio: the shared masonry grid, plus the
 * things only its owner may do to it.
 *
 * The grid, the tiles and the viewer come from `@sinnapi/ui/media`, so what the
 * vendor arranges here is laid out exactly as a client will see it. Ownership is
 * layered on through the kit's render slots rather than by forking it — the
 * badge, the hover controls, and the drag wrapper below.
 */
export default function PortfolioGrid({
  items,
  vendorName,
  canReorder,
  dragIndex,
  busyId,
  onOpen,
  onMove,
  onSetCover,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: Props) {
  function wrapForDrag(index: number, tile: ReactNode): ReactNode {
    if (!canReorder) return tile;
    return (
      <Box
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(event) => {
          // Without this the drop is rejected and no reflow happens at all.
          event.preventDefault();
          onDragOver(index);
        }}
        onDrop={(event) => event.preventDefault()}
        onDragEnd={onDragEnd}
        sx={{
          cursor: 'grab',
          opacity: dragIndex === index ? 0.4 : 1,
          transition: 'opacity .15s ease',
          '&:active': { cursor: 'grabbing' },
          // An <img> is natively draggable and would hijack the gesture, starting
          // a drag of the picture instead of the tile.
          '& img': { WebkitUserDrag: 'none', userSelect: 'none' },
        }}
      >
        {tile}
      </Box>
    );
  }

  return (
    <MediaGrid
      items={items}
      fallbackAlt={vendorName}
      onOpen={onOpen}
      renderBadge={(item) => (item.is_primary ? <CoverBadge /> : null)}
      renderOverlay={(item, index) => (
        <PortfolioTileActions
          item={item}
          index={index}
          total={items.length}
          canReorder={canReorder}
          busy={busyId === item.id}
          onMove={onMove}
          onSetCover={onSetCover}
          onRemove={onRemove}
        />
      )}
      renderWrapper={(_item, index, tile) => wrapForDrag(index, tile)}
    />
  );
}
