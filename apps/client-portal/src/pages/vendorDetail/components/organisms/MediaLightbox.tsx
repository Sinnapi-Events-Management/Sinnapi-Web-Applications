import { Box, Dialog, IconButton, Stack, Typography, alpha } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import LightboxNavButton from '../atoms/LightboxNavButton';
import MediaFrame from '../molecules/MediaFrame';
import type { PlayableMedia } from '../../utils/mediaSource';

type Props = {
  item: PlayableMedia | null;
  vendorName: string;
  position: number;
  count: number;
  /** False for a single-item gallery, where stepping would be a no-op. */
  canStep: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

/**
 * Full-bleed viewer for one portfolio item.
 *
 * The 4px-blurred scrim comes from the shared theme, so this dialog matches
 * every other modal in the platform without restating it. The paper itself is
 * near-black and transparent instead of a panel: media should read as floating
 * over the page, and a light card behind a photo distorts how its colours look.
 */
export default function MediaLightbox({
  item,
  vendorName,
  position,
  count,
  canStep,
  onClose,
  onNext,
  onPrevious,
  onKeyDown,
}: Props) {
  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      onKeyDown={onKeyDown}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: (t) => alpha(t.palette.common.black, 0.82),
          backgroundImage: 'none',
          boxShadow: 'none',
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      {item && (
        <>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ px: 2, py: 1.5, color: 'common.white' }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                {item.caption ?? vendorName}
              </Typography>
              {count > 1 && (
                <Typography variant="caption" sx={{ color: 'grey.400' }}>
                  {position} of {count}
                </Typography>
              )}
            </Box>
            <IconButton onClick={onClose} aria-label="Close viewer" sx={{ color: 'common.white' }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Box
            sx={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              p: { xs: 0, sm: 1 },
            }}
          >
            <MediaFrame item={item} fallbackAlt={vendorName} />
            {canStep && (
              <>
                <LightboxNavButton direction="previous" onClick={onPrevious} />
                <LightboxNavButton direction="next" onClick={onNext} />
              </>
            )}
          </Box>
        </>
      )}
    </Dialog>
  );
}
