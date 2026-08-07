import { Box, Button, Stack, Typography } from '@sinnapi/ui';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { PlayableMedia } from '../../utils/mediaSource';

type Props = {
  item: PlayableMedia;
  /** Names the vendor when an item carries no caption. */
  fallbackAlt: string;
};

/**
 * Renders whichever of the three playable shapes an item resolved to, sized to
 * fit the viewport rather than its own dimensions — a portrait photo and a
 * 16:9 clip both stay fully visible without the dialog growing a scrollbar.
 */
export default function MediaFrame({ item, fallbackAlt }: Props) {
  const label = item.caption ?? fallbackAlt;
  const { source } = item;

  if (source.kind === 'image') {
    return (
      <Box
        component="img"
        src={source.src}
        alt={label}
        sx={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', display: 'block' }}
      />
    );
  }

  if (source.kind === 'video-file') {
    return (
      <Box
        component="video"
        // Keyed on the URL so switching items tears down the old element rather
        // than swapping the source underneath a player that is already playing.
        key={source.src}
        src={source.src}
        controls
        autoPlay
        playsInline
        sx={{ maxWidth: '100%', maxHeight: '78vh', display: 'block', outline: 'none' }}
      />
    );
  }

  if (source.kind === 'video-embed') {
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 'min(100%, 138vh)',
          aspectRatio: '16 / 9',
          bgcolor: 'common.black',
        }}
      >
        <Box
          component="iframe"
          key={source.src}
          src={source.src}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          // The player is third-party: sandboxed to scripts and same-origin so
          // it can run, but not navigate the page hosting it.
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </Box>
    );
  }

  return (
    <Stack spacing={2} alignItems="center" sx={{ p: 6, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ color: 'common.white' }}>
        This item can’t be played here
      </Typography>
      <Typography variant="body2" sx={{ color: 'grey.400' }}>
        {label}
      </Typography>
      <Button
        href={source.src}
        target="_blank"
        rel="noopener noreferrer"
        variant="contained"
        startIcon={<OpenInNewIcon />}
      >
        Open in a new tab
      </Button>
    </Stack>
  );
}
