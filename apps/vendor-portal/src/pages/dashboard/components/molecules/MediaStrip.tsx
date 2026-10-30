import { Box, Stack, Typography } from '@sinnapi/ui';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { MediaPlayBadge, isVideoSource, posterUrl, type PlayableMedia } from '@sinnapi/ui/media';
import type { MediaModel } from '@/lib/types';

type Props = {
  items: PlayableMedia<MediaModel>[];
  /** Items past the strip, shown as "+N" on the last tile. */
  hidden: number;
};

/**
 * A row of thumbnails: the vendor's own work, on the first screen they see.
 *
 * Deliberately not the media kit's `MediaThumbStrip` — that one belongs to the
 * viewer, where it tracks an active index, scrolls itself and sits on a fixed
 * dark surface. This is a preview with no selection of its own. What it does
 * reuse is the part worth sharing: the kit's source classifier and play badge,
 * so a stored video shows its poster frame here exactly as it does in the
 * gallery.
 *
 * Tiles share the width rather than scrolling, so a phone shows the same five
 * items as a desktop, just smaller. The whole strip is wrapped in one link by
 * the card above, which is why nothing in here is focusable and the images carry
 * empty alt text: five identical "open your gallery" stops would be noise, and
 * the card's own count line already says what the strip shows.
 */
export default function MediaStrip({ items, hidden }: Props) {
  return (
    <Stack direction="row" spacing={1} aria-hidden>
      {items.map((item, index) => {
        const poster = posterUrl(item.source);
        const isVideo = isVideoSource(item.source);
        const isLast = index === items.length - 1;

        return (
          <Box
            key={item.id}
            sx={{
              position: 'relative',
              flex: '1 1 0',
              minWidth: 0,
              maxWidth: 96,
              aspectRatio: '1 / 1',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'action.hover',
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
            ) : (
              <Box sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                <MovieOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </Box>
            )}

            {isVideo && <MediaPlayBadge size="small" />}

            {/* The overflow count rides the last tile instead of taking a tile of
                its own, so the strip always shows as much work as it can. */}
            {isLast && hidden > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(0, 0, 0, 0.55)',
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'common.white' }}>
                  +{hidden}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
