import { ImageList, ImageListItem, useMediaQuery, useTheme } from '@sinnapi/ui';
import MediaTile from '../atoms/MediaTile';
import type { PlayableMedia } from '../../utils/mediaSource';

type Props = {
  items: PlayableMedia[];
  vendorName: string;
  onOpen: (index: number) => void;
};

/**
 * The portfolio as a masonry grid, matching the public vendor page so a visitor
 * who arrives from the marketing site sees the same work laid out the same way.
 * Masonry keeps each shot at its true aspect ratio — cropping a vendor's
 * portfolio to a uniform square is exactly the wrong call for this content.
 */
export default function MediaGrid({ items, vendorName, onOpen }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const columns = isMobile ? 1 : isTablet ? 2 : 3;

  return (
    <ImageList variant="masonry" cols={columns} gap={12} sx={{ m: 0, overflow: 'visible' }}>
      {items.map((item, index) => (
        <ImageListItem key={item.id}>
          <MediaTile item={item} fallbackAlt={vendorName} onOpen={() => onOpen(index)} />
        </ImageListItem>
      ))}
    </ImageList>
  );
}
