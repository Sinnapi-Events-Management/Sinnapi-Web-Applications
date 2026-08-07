'use client';
import { Box, Collapse, List, ListItemButton, ListItemText } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PortalNavLink } from './PortalNavLink';
import type { PortalNavItem, PortalNavSection } from './types';

export interface PortalNavGroupProps {
  section: PortalNavSection;
  open: boolean;
  onToggle: () => void;
  isItemActive: (item: PortalNavItem) => boolean;
  badges: Record<string, number>;
  onNavigate?: () => void;
}

/** A titled, collapsible group of nav rows in the expanded sidebar. */
export function PortalNavGroup({
  section,
  open,
  onToggle,
  isItemActive,
  badges,
  onNavigate,
}: PortalNavGroupProps) {
  return (
    <List dense disablePadding sx={{ px: 1.25 }}>
      <ListItemButton
        onClick={onToggle}
        aria-expanded={open}
        sx={{ borderRadius: 1.5, py: 0.5, mt: 0.5 }}
      >
        <ListItemText
          primary={section.title}
          primaryTypographyProps={{
            variant: 'overline',
            color: 'text.secondary',
            sx: { fontWeight: 700, fontSize: '0.75rem', letterSpacing: '1px' },
          }}
        />
        {open ? (
          <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        ) : (
          <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        )}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ mb: 0.5 }}>
          {section.items.map((item) => (
            <PortalNavLink
              key={item.to}
              item={item}
              active={isItemActive(item)}
              badge={item.badgeKey ? badges[item.badgeKey] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </Box>
      </Collapse>
    </List>
  );
}
