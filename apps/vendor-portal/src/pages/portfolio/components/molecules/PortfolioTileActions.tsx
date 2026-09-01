import { Box, IconButton, Tooltip, alpha } from '@sinnapi/ui';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import type { MediaModel } from '@/lib/types';

type Props = {
  item: MediaModel;
  index: number;
  total: number;
  /** Position controls only make sense on the unfiltered, multi-item grid. */
  canReorder: boolean;
  busy: boolean;
  onMove: (index: number, delta: number) => void;
  onSetCover: (item: MediaModel) => void;
  onRemove: (item: MediaModel) => void;
};

/**
 * The controls layered on a tile: where it sits, whether it is the cover, and
 * removing it.
 *
 * Two things make this work on every device. It fades in on hover for a mouse
 * but is permanently visible where there is no hover to fade in on — a phone
 * would otherwise show a grid with no controls at all. And the arrows are not a
 * convenience beside the drag: HTML5 drag events never fire on touch, so on a
 * phone they are the *only* way to reorder, which is why they are buttons on the
 * tile rather than something hidden behind a menu.
 */
export default function PortfolioTileActions({
  item,
  index,
  total,
  canReorder,
  busy,
  onMove,
  onSetCover,
  onRemove,
}: Props) {
  const isCover = !!item.is_primary;
  const isImage = item.media_type !== 'video';

  return (
    <Box
      className="media-tile-overlay"
      sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 0.5,
        p: 0.5,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.common.black, 0.55),
        backdropFilter: 'blur(6px)',
        border: (t) => `1px solid ${alpha(t.palette.common.white, 0.22)}`,
        opacity: 0,
        transition: 'opacity .18s ease',
        // No hover to reveal them on a touch screen, so they simply stay.
        '@media (hover: none)': { opacity: 1 },
      }}
    >
      {canReorder && (
        <>
          <TileAction
            label="Move earlier"
            disabled={busy || index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ArrowBackRoundedIcon fontSize="small" />
          </TileAction>
          <TileAction
            label="Move later"
            disabled={busy || index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowForwardRoundedIcon fontSize="small" />
          </TileAction>
        </>
      )}

      {/* Only a photo can be the cover — the public profile leads with a still. */}
      {isImage && (
        <TileAction
          label={isCover ? 'This is your cover photo' : 'Set as cover photo'}
          disabled={busy || isCover}
          onClick={() => onSetCover(item)}
        >
          {isCover ? (
            <StarRoundedIcon fontSize="small" sx={{ color: 'primary.light' }} />
          ) : (
            <StarOutlineRoundedIcon fontSize="small" />
          )}
        </TileAction>
      )}

      <TileAction label="Remove" disabled={busy} destructive onClick={() => onRemove(item)}>
        <DeleteOutlineRoundedIcon fontSize="small" />
      </TileAction>
    </Box>
  );
}

function TileAction({
  label,
  disabled,
  destructive,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    // The span keeps the tooltip working while the button is disabled, which is
    // when the explanation is most worth having.
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          sx={{
            color: 'common.white',
            '&.Mui-disabled': { color: (t) => alpha(t.palette.common.white, 0.35) },
            '&:hover': {
              bgcolor: (t) =>
                alpha(destructive ? t.palette.error.main : t.palette.common.white, 0.22),
            },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
