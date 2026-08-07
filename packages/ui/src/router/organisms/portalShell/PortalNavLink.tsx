'use client';
import { Badge, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NavLink } from 'react-router-dom';
import type { PortalNavItem } from './types';

export interface PortalNavLinkProps {
  item: PortalNavItem;
  active: boolean;
  /** Count for the item's `badgeKey`; falsy values hide the badge. */
  badge?: number;
  onNavigate?: () => void;
}

/** A nav row in the expanded sidebar: icon, label, optional count badge. */
export function PortalNavLink({ item, active, badge, onNavigate }: PortalNavLinkProps) {
  const Icon = item.icon;

  return (
    <ListItemButton
      component={NavLink}
      to={item.to}
      selected={active}
      onClick={onNavigate}
      sx={{ borderRadius: 1.5, mb: 0.25, pl: 2 }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
        <Icon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{ variant: 'subtitle2', fontWeight: active ? 600 : 500 }}
      />
      {!!badge && <Badge color="error" badgeContent={badge} sx={{ mr: 1.5 }} />}
    </ListItemButton>
  );
}
