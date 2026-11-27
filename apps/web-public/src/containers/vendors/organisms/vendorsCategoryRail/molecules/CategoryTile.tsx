'use client';
import type { ElementType } from 'react';
import { Box, ButtonBase, Typography } from '@sinnapi/ui/atoms';

type CategoryTileProps = {
  label: string;
  icon: ElementType;
  active: boolean;
  /** Result count; omitted while counts are unavailable. */
  count?: number;
  /** Zero-result tiles are dimmed and inert — unless selected, so the visitor can always leave. */
  disabled?: boolean;
  onClick: () => void;
};

/**
 * One icon-over-label tile. The whole tile is the tap target (≥ 76×84px, well
 * past the 44px minimum) and the icon sits in a circle so the selected state
 * reads from across the room, not just from a thin underline.
 */
export default function CategoryTile({
  label,
  icon: Icon,
  active,
  count,
  disabled,
  onClick,
}: CategoryTileProps) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-active={active}
      // The visible label is clipped to two lines; the name stays complete here.
      aria-label={count != null ? `${label}, ${count} vendors` : label}
      sx={{
        flex: '0 0 auto',
        width: { xs: 80, md: 92 },
        px: 0.5,
        pt: 1,
        pb: 1.25,
        gap: 0.75,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderRadius: 2,
        scrollSnapAlign: 'center',
        opacity: disabled ? 0.4 : 1,
        borderBottom: '2px solid',
        borderColor: active ? 'primary.main' : 'transparent',
        transition: 'background-color .2s ease, border-color .2s ease, opacity .2s ease',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          border: '1px solid',
          borderColor: active ? 'primary.main' : 'divider',
          bgcolor: active ? 'primary.main' : 'background.paper',
          color: active ? 'primary.contrastText' : 'text.secondary',
          transition: 'all .2s ease',
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Typography
        variant="caption"
        sx={{
          lineHeight: 1.25,
          fontWeight: active ? 700 : 500,
          color: active ? 'text.primary' : 'text.secondary',
          textAlign: 'center',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          overflowWrap: 'anywhere',
          minHeight: '2.5em',
        }}
      >
        {label}
      </Typography>
      {count != null && (
        <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1, fontSize: 11 }}>
          {count}
        </Typography>
      )}
    </ButtonBase>
  );
}
