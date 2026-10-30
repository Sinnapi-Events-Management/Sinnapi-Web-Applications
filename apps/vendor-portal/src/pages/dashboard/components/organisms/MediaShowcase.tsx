import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ButtonBase, SectionCard, Skeleton, Stack, Typography } from '@sinnapi/ui';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import { ADD_MEDIA_LABEL, ADD_MEDIA_PATH, MEDIA_PATH } from '@/lib/config';
import {
  HEALTHY_MEDIA_COUNT,
  SHOWCASE_THUMBS,
  type DashboardMedia,
} from '../../hooks/useDashboardMedia';
import MediaStrip from '../molecules/MediaStrip';

type Props = { media: DashboardMedia };

/** "4 photos · 1 video", skipping whichever is zero. */
function countLine({ photos, videos }: DashboardMedia): string {
  const parts: string[] = [];
  if (photos > 0) parts.push(`${photos} ${photos === 1 ? 'photo' : 'photos'}`);
  if (videos > 0) parts.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`);
  return `${parts.join(' · ')} on your public profile`;
}

/**
 * The way into Photos & Videos from the first screen a vendor sees.
 *
 * It exists because the gallery was reachable only from the ninth item of a
 * nineteen-item sidebar, under a word — "Portfolio" — that our vendors do not
 * use. A vendor who never found it is competing on a listing with no pictures,
 * which is the one gap on a listing that no amount of pricing or availability
 * work makes up for.
 *
 * So the card is a nudge that knows when to stop being one. With nothing
 * uploaded it leads with the reason and a single filled button; with one or two
 * items it keeps asking, quietly; once the gallery is established it drops to a
 * strip of their own work, the count, and a low-weight way to add more. The
 * primary button goes straight to the uploader (`?add=1`) rather than to the
 * page — the vendor's intent was "add", and landing them on a grid they must
 * then scan for a second button is where this kind of prompt usually leaks.
 */
export default function MediaShowcase({ media }: Props) {
  const { loading, total, preview, hidden, isEmpty, isThin } = media;

  return (
    <SectionCard
      title="Photos & Videos"
      icon={<PhotoLibraryOutlinedIcon />}
      accent={isEmpty ? 'warning' : 'secondary'}
      action={
        total > 0 && (
          <Button
            component={RouterLink}
            to={MEDIA_PATH}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Manage
          </Button>
        )
      }
    >
      {loading && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            {Array.from({ length: SHOWCASE_THUMBS }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                sx={{ flex: '1 1 0', maxWidth: 96, aspectRatio: '1 / 1', height: 'auto' }}
              />
            ))}
          </Stack>
          <Skeleton variant="text" width="45%" />
        </Stack>
      )}

      {!loading && (
        <Stack spacing={2}>
          {isEmpty ? (
            // Stated as what to do next, not as what is missing: "you have no
            // media" tells a vendor off for something they never knew existed.
            <Typography variant="body2" color="text.secondary">
              Start with three or four photos of your best work. Clients look at pictures before
              they read a word of your profile — videos count too.
            </Typography>
          ) : (
            <>
              {/* One link for the whole strip. The thumbnails themselves are
                  inert; see `MediaStrip`. */}
              <ButtonBase
                component={RouterLink}
                to={MEDIA_PATH}
                aria-label="Open your photos and videos"
                sx={{
                  display: 'block',
                  width: '100%',
                  borderRadius: 2,
                  textAlign: 'left',
                  '&:hover': { opacity: 0.9 },
                }}
              >
                <MediaStrip items={preview} hidden={hidden} />
              </ButtonBase>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {countLine(media)}
                </Typography>
                {isThin && (
                  <Typography variant="caption" color="text.secondary">
                    {HEALTHY_MEDIA_COUNT} or more gives a client the full picture.
                  </Typography>
                )}
              </Box>
            </>
          )}

          {/* Text weight, not filled: the dashboard's own toolbar now carries
              this action as its primary button, and on a phone the floating one
              carries it too. Three filled buttons for one action would make the
              screen look like three different offers. The card's job is the
              reason and the preview; it keeps a way in, quietly. */}
          <Button
            component={RouterLink}
            to={ADD_MEDIA_PATH}
            variant="text"
            size="small"
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            {ADD_MEDIA_LABEL}
          </Button>
        </Stack>
      )}
    </SectionCard>
  );
}
