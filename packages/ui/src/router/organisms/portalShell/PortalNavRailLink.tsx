'use client';
import { Badge, ListItemButton, ListItemIcon, Tooltip } from '@mui/material';
import { NavLink } from 'react-router-dom';
import type { PortalNavItem } from './types';

export interface PortalNavRailLinkProps {
  item: PortalNavItem;
  active: boolean;
  badge?: number;
}

/**
 * A nav row in the collapsed rail. The label moves into a tooltip and the count
 * badge degrades to a dot, since there is no room for a number at 72px.
 */
export function PortalNavRailLink({ item, active, badge }: PortalNavRailLinkProps) {
  const Icon = item.icon;

  return (
    <Tooltip title={item.label} placement="right" arrow>
      <ListItemButton
        component={NavLink}
        to={item.to}
        selected={active}
        aria-label={item.label}
        sx={{ borderRadius: 1.5, mx: 1, my: 0.25, minHeight: 44, justifyContent: 'center' }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            justifyContent: 'center',
            color: active ? 'primary.main' : 'text.secondary',
          }}
        >
          <Badge color="error" variant="dot" invisible={!badge}>
            <Icon fontSize="small" />
          </Badge>
        </ListItemIcon>
      </ListItemButton>
    </Tooltip>
  );
}
