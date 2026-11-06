'use client';
import { Badge, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { NavLink, useLocation } from 'react-router-dom';
import { BOTTOM_NAV_HEIGHT } from './constants';
import { isRouteActive } from './hooks/useNavModel';
import type { PortalBottomNavItem } from './types';

export interface PortalBottomNavProps {
  items: PortalBottomNavItem[];
  moreLabel: string;
  badges: Record<string, number>;
  /** Opens the full menu drawer. */
  onOpenMore: () => void;
}

const MORE = '__more__';

function matches(pathname: string, item: PortalBottomNavItem): boolean {
  return (
    isRouteActive(pathname, item.to) || (item.matches ?? []).some((m) => isRouteActive(pathname, m))
  );
}

/**
 * Phone-only tab bar, the pattern people already know from WhatsApp and
 * Facebook: the everyday destinations always on screen, in thumb reach, each
 * with an icon AND a word. "More" opens the full menu, and lights up whenever
 * the current page is not one of the tabs, so the bar always says where you are.
 */
export function PortalBottomNav({ items, moreLabel, badges, onOpenMore }: PortalBottomNavProps) {
  const { pathname } = useLocation();
  const active = items.find((item) => matches(pathname, item))?.to ?? MORE;

  return (
    <Paper
      component="nav"
      aria-label="Main"
      elevation={0}
      square
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <BottomNavigation
        showLabels
        value={active}
        sx={{ height: BOTTOM_NAV_HEIGHT, bgcolor: 'transparent' }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const count = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <BottomNavigationAction
              key={item.to}
              value={item.to}
              label={item.label}
              component={NavLink}
              to={item.to}
              icon={
                <Badge color="error" badgeContent={count} invisible={!count} max={99}>
                  <Icon />
                </Badge>
              }
              sx={actionSx}
            />
          );
        })}
        <BottomNavigationAction
          value={MORE}
          label={moreLabel}
          icon={<MenuIcon />}
          onClick={onOpenMore}
          aria-haspopup="dialog"
          sx={actionSx}
        />
      </BottomNavigation>
    </Paper>
  );
}

// Labels stay full size even when inactive: shrinking the word on the tabs you
// are not on makes them harder to read for exactly the people this bar is for.
const actionSx = {
  minWidth: 0,
  px: 0.5,
  '& .MuiBottomNavigationAction-label': {
    fontSize: '0.75rem',
    fontWeight: 600,
    mt: 0.25,
    whiteSpace: 'nowrap',
    '&.Mui-selected': { fontSize: '0.75rem' },
  },
} as const;
