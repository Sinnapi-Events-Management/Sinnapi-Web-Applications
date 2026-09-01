import { IconButton, Tooltip, alpha } from '@sinnapi/ui';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { MediaModel } from '@/lib/types';

type Props = {
  item: MediaModel;
  busy: boolean;
  onSetCover: (item: MediaModel) => void;
  onRemove: (item: MediaModel) => void;
};

/**
 * The same two decisions the grid offers, available without leaving the viewer.
 *
 * A vendor deciding which shot should lead their profile is doing it *while
 * looking at it full-screen*, not while squinting at a thumbnail — so making
 * them close the viewer to act on that judgement is the one thing this avoids.
 * Removal opens the same confirmation the grid does; the viewer is not a place
 * where destructive actions get quieter.
 */
export default function PortfolioViewerActions({ item, busy, onSetCover, onRemove }: Props) {
  const isCover = !!item.is_primary;
  const isImage = item.media_type !== 'video';

  return (
    <>
      {isImage && (
        <Tooltip title={isCover ? 'This is your cover photo' : 'Set as cover photo'}>
          <span>
            <IconButton
              aria-label={isCover ? 'This is your cover photo' : 'Set as cover photo'}
              disabled={busy || isCover}
              onClick={() => onSetCover(item)}
              sx={{
                color: isCover ? 'primary.light' : 'common.white',
                '&.Mui-disabled': {
                  color: (t) =>
                    isCover ? t.palette.primary.light : alpha(t.palette.common.white, 0.35),
                },
              }}
            >
              {isCover ? <StarRoundedIcon /> : <StarOutlineRoundedIcon />}
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Tooltip title="Remove">
        <span>
          <IconButton
            aria-label="Remove"
            disabled={busy}
            onClick={() => onRemove(item)}
            sx={{
              color: 'common.white',
              '&.Mui-disabled': { color: (t) => alpha(t.palette.common.white, 0.35) },
              '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.28) },
            }}
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </span>
      </Tooltip>
    </>
  );
}
