'use client';
import { Box, Divider, List } from '@mui/material';
import { PortalBrandMark } from './PortalBrandMark';
import { PortalNavGroup } from './PortalNavGroup';
import { PortalNavRailLink } from './PortalNavRailLink';
import type { NavModel } from './hooks/useNavModel';
import type { PortalBrand } from './types';

export interface PortalSidebarNavProps {
  brand: PortalBrand;
  logoSrc: string;
  homeTo: string;
  nav: NavModel;
  badges: Record<string, number>;
  /** Rail treatment: icons only, group titles reduced to dividers. */
  mini: boolean;
  onToggleCollapsed?: () => void;
  /** Closes the temporary drawer after a mobile tap. */
  onNavigate?: () => void;
}

/** Sidebar contents: brand header over a scrollable, grouped nav. */
export function PortalSidebarNav({
  brand,
  logoSrc,
  homeTo,
  nav,
  badges,
  mini,
  onToggleCollapsed,
  onNavigate,
}: PortalSidebarNavProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <PortalBrandMark
        brand={brand}
        logoSrc={logoSrc}
        homeTo={homeTo}
        mini={mini}
        onToggleCollapsed={onToggleCollapsed}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2 }}>
        {nav.visibleSections.map((section, index) =>
          mini ? (
            <Box key={section.title}>
              {index > 0 && <Divider sx={{ my: 0.5, mx: 1.5 }} />}
              <List dense disablePadding>
                {section.items.map((item) => (
                  <PortalNavRailLink
                    key={item.to}
                    item={item}
                    active={nav.isItemActive(item)}
                    badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                  />
                ))}
              </List>
            </Box>
          ) : (
            <PortalNavGroup
              key={section.title}
              section={section}
              open={nav.isGroupOpen(section.title)}
              onToggle={() => nav.toggleGroup(section.title)}
              isItemActive={nav.isItemActive}
              badges={badges}
              onNavigate={onNavigate}
            />
          ),
        )}
      </Box>
    </Box>
  );
}
