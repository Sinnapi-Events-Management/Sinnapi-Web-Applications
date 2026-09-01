import { Alert, Paper, Skeleton, Stack, Typography } from '@sinnapi/ui';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import { MediaGrid, MediaViewer, useMediaViewer, type PlayableMedia } from '@sinnapi/ui/media';
import VendorSectionHeading from '../atoms/VendorSectionHeading';
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
 * It used to render nothing at all on an empty portfolio, so a vendor with no
 * uploads got a clean profile rather than an "add media" hole. Under tabs that
 * inverts: the hole becomes a tab that opens onto blank space, which reads as a
 * page that failed rather than a vendor who hasn't uploaded. The tab set is
 * fixed — see `schema/tabs.ts` — so this section now always says something, and
 * the thing it says on an empty portfolio is a route to the vendor instead.
 *
 * The grid, the viewer and the strip all come from `@sinnapi/ui/media`, so what a
 * client sees here is the same surface the vendor curates their portfolio
 * through — and a fix to either reaches both.
 */
export default function VendorMediaSection({ items, vendorName, isLoading, error }: Props) {
  const viewer = useMediaViewer(items);

  return (
    <section>
      <VendorSectionHeading
        eyebrow="Portfolio"
        title="Photos & videos"
        subtitle={`Work ${vendorName} has published. Tap any tile to open it full screen.`}
      />

      {isLoading ? (
        <Stack direction="row" spacing={1.5}>
          {SKELETON_HEIGHTS.slice(0, 3).map((height, index) => (
            <Skeleton key={index} variant="rounded" height={height} sx={{ flex: 1 }} />
          ))}
        </Stack>
      ) : error ? (
        <Alert severity="warning">This vendor’s photos and videos couldn’t be loaded.</Alert>
      ) : items.length === 0 ? (
        <EmptyPortfolio vendorName={vendorName} />
      ) : (
        <>
          <MediaGrid items={items} fallbackAlt={vendorName} onOpen={viewer.openAt} />
          <MediaViewer
            items={items}
            item={viewer.active}
            index={viewer.index}
            position={viewer.position}
            count={viewer.count}
            fallbackAlt={vendorName}
            canStep={viewer.canStep}
            onClose={viewer.close}
            onNext={viewer.next}
            onPrevious={viewer.previous}
            onSelect={viewer.goTo}
            onKeyDown={viewer.onKeyDown}
          />
        </>
      )}
    </section>
  );
}

/**
 * Says the portfolio is empty without implying the vendor is unproven — plenty
 * of good vendors are booked entirely on referral and have never uploaded a
 * photo, and a visitor reading this should be pointed at the person, not left
 * to draw a conclusion.
 */
function EmptyPortfolio({ vendorName }: { vendorName: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 3, sm: 5 },
        borderRadius: 3,
        borderStyle: 'dashed',
        textAlign: 'center',
        // Reads as a placeholder in both modes: a hair off the page in light,
        // a hair above it in dark, rather than a hard-coded grey either way.
        bgcolor: 'action.hover',
      }}
    >
      <PhotoLibraryOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
      <Typography variant="subtitle1">No photos or videos yet</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {vendorName} hasn’t published a portfolio here. Message them and ask to see recent work.
      </Typography>
    </Paper>
  );
}
