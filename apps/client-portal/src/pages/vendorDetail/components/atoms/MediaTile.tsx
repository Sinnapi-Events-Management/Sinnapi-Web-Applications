import { Box, ButtonBase, Typography, alpha } from '@sinnapi/ui';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import { posterUrl, type PlayableMedia } from '../../utils/mediaSource';

type Props = {
  item: PlayableMedia;
  /** Names the vendor when an item has no caption of its own. */
  fallbackAlt: string;
  onOpen: () => void;
};

/**
 * One clickable item in the portfolio grid.
 *
 * Videos are the awkward case: `vendor_media` stores no poster frame, so each
 * source gets the best still it can offer — YouTube's published thumbnail for an
 * embed, the first frame for a direct file (`preload="metadata"` fetches the
 * header only, not the whole clip), and a neutral placeholder for anything else.
 * A play badge marks all three so the grid never implies a still image.
 */
export default function MediaTile({ item, fallbackAlt, onOpen }: Props) {
  const label = item.caption ?? fallbackAlt;
  const poster = posterUrl(item.source);
  const isVideo = item.source.kind !== 'image';

  return (
    <ButtonBase
      onClick={onOpen}
      focusRipple
      aria-label={isVideo ? `Play ${label}` : `View ${label}`}
      sx={{
        display: 'block',
        width: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'action.hover',
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

        {isVideo && <PlayBadge />}

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

function PlayBadge() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          color: 'common.white',
          bgcolor: (t) => alpha(t.palette.common.black, 0.55),
          backdropFilter: 'blur(4px)',
          border: (t) => `1px solid ${alpha(t.palette.common.white, 0.5)}`,
        }}
      >
        <PlayArrowRoundedIcon sx={{ fontSize: 32 }} />
      </Box>
    </Box>
  );
}
