'use client';
import type { ReactNode } from 'react';
import { Badge, IconButton, Tooltip, alpha } from '@mui/material';

export type PortalBadgeButtonProps = {
  icon: ReactNode;
  /** Tooltip copy and the base of the accessible name. */
  label: string;
  count: number;
  /** Anything above this renders as "N+". */
  max?: number;
  /** Palette family for the count bubble. */
  color?: 'primary' | 'error' | 'secondary' | 'info';
  /** The panel this button controls is open — the button reads as pressed. */
  open?: boolean;
  /** Ring the icon once; driven by `useUnreadPulse`. */
  pulse?: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

/**
 * A top-bar icon button carrying an unread count.
 *
 * The count is spoken as well as shown. `Badge` alone renders a bare number
 * beside a glyph, which a screen reader announces as "Messages 3" at best and
 * "Messages" at worst — so the accessible name spells the state out in words
 * and the badge itself is hidden from the tree.
 *
 * The pulse is a ring that grows out of the button rather than a transform on
 * it: scaling the button moves the icon under a cursor already on its way to
 * click it. It is suppressed entirely under `prefers-reduced-motion`, where the
 * count alone carries the change.
 */
export function PortalBadgeButton({
  icon,
  label,
  count,
  max = 99,
  color = 'error',
  open = false,
  pulse = false,
  onClick,
}: PortalBadgeButtonProps) {
  const unread = count > 0;
  const description = unread
    ? `${label}, ${count > max ? `over ${max}` : count} unread`
    : `${label}, none unread`;

  return (
    <Tooltip title={label}>
      <IconButton
        onClick={onClick}
        aria-label={description}
        aria-haspopup="dialog"
        aria-expanded={open}
        sx={{
          position: 'relative',
          color: unread ? 'text.primary' : 'text.secondary',
          bgcolor: open ? 'action.selected' : 'transparent',
          transition: 'background-color 120ms ease, color 120ms ease',
          '&:hover': { color: 'text.primary' },
          // The ring is a pseudo-element so nothing in the layout moves.
          '&::after': pulse
            ? {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: 2,
                borderColor: (t) => alpha(t.palette[color].main, 0.6),
                animation: 'portalBadgePulse 1.8s ease-out 1',
                pointerEvents: 'none',
              }
            : undefined,
          '@keyframes portalBadgePulse': {
            '0%': { transform: 'scale(0.85)', opacity: 0.9 },
            '70%': { transform: 'scale(1.45)', opacity: 0 },
            '100%': { transform: 'scale(1.45)', opacity: 0 },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '&::after': { animation: 'none', display: 'none' },
          },
        }}
      >
        <Badge
          color={color}
          badgeContent={count}
          max={max}
          aria-hidden
          overlap="circular"
          sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: 10, minWidth: 18, height: 18 } }}
        >
          {icon}
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
