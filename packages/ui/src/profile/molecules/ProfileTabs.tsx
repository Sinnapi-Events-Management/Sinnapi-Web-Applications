'use client';
import { Box, Tab, Tabs } from '@mui/material';
import type { ProfileTabItem } from '../types';

export type ProfileTabsProps<T extends string> = {
  items: readonly ProfileTabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  /** Names the tablist for screen readers, e.g. `Profile sections`. */
  ariaLabel: string;
};

/**
 * The section switcher for a profile-style page.
 *
 * Values are the tab *names* rather than indices, which is what lets them go
 * straight into the URL (see `useUrlTab`) and means inserting a section later
 * can't silently re-point an existing link.
 */
export function ProfileTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: ProfileTabsProps<T>) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={value}
        onChange={(_, next: T) => onChange(next)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={ariaLabel}
      >
        {items.map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={item.label}
            icon={item.icon}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
