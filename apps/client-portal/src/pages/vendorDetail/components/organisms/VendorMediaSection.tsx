import { Alert, Box, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { MediaGrid, MediaViewer, useMediaViewer, type PlayableMedia } from '@sinnapi/ui/media';
import type { VendorMediaModel } from '@/lib/types';

type Props = {
  items: PlayableMedia<VendorMediaModel>[];
  vendorName: string;
  isLoading: boolean;
  error: unknown;
};

/** Placeholder tiles while the portfolio loads, at varied heights so the
 *  skeleton reads as a masonry grid rather than a table. */
const SKELETON_HEIGHTS = [220, 170, 260, 190, 240, 200];

/**
 * The portfolio section: the grid, its three states, and the viewer it opens.
 *
 * Media is presentational extra rather than page content, so an empty portfolio
 * renders nothing at all — a vendor with no uploads gets a clean profile, not an
 * "Add media" hole. A failed fetch is worth a quiet note, since the visitor can
 * otherwise not tell the difference between "no work shown" and "didn't load".
 *
 * The grid, the viewer and the strip all come from `@sinnapi/ui/media`, so what a
 * client sees here is the same surface the vendor curates their portfolio
 * through — and a fix to either reaches both.
 */
export default function VendorMediaSection({ items, vendorName, isLoading, error }: Props) {
  const viewer = useMediaViewer(items);

  if (isLoading) {
    return (
      <Box sx={{ mt: 4 }}>
        <SectionHeading />
        <Stack direction="row" spacing={1.5}>
          {SKELETON_HEIGHTS.slice(0, 3).map((height, index) => (
            <Skeleton key={index} variant="rounded" height={height} sx={{ flex: 1 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mt: 4 }}>
        This vendor’s photos and videos couldn’t be loaded.
      </Alert>
    );
  }

  if (items.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <SectionHeading />
      <MediaGrid items={items} fallbackAlt={vendorName} onOpen={viewer.openAt} />
      <MediaViewer
        items={items}
        item={viewer.active}
        index={viewer.index}
        position={viewer.position}
        count={viewer.count}
        canStep={viewer.canStep}
        fallbackAlt={vendorName}
        onClose={viewer.close}
        onNext={viewer.next}
        onPrevious={viewer.previous}
        onSelect={viewer.goTo}
        onKeyDown={viewer.onKeyDown}
      />
    </Box>
  );
}

function SectionHeading() {
  return (
    <>
      <Typography variant="overline" color="secondary">
        Portfolio
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, mb: 2 }}>
        Photos &amp; videos
      </Typography>
    </>
  );
}
