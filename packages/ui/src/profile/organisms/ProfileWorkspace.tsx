'use client';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import {
  ProfileSectionNav,
  profileSectionIds,
  type ProfileSectionNavProps,
} from '../molecules/ProfileSectionNav';

export type ProfileWorkspaceProps<T extends string> = ProfileSectionNavProps<T> & {
  /** The active section's panel. */
  children: ReactNode;
  /** Pinned under the panel — usually a `StickySaveBar`. */
  footer?: ReactNode;
};

/**
 * Section menu beside one panel: the layout every profile page uses once it has
 * more to edit than fits on a screen.
 *
 * A fixed 232px menu column rather than a grid fraction, so the menu doesn't grow
 * on a wide monitor. `minmax(0, 1fr)` lets the panel shrink below its content's
 * natural width, so a long URL can't push the page sideways. Below `md` the menu
 * stacks above the panel as a sticky strip.
 */
export function ProfileWorkspace<T extends string>({
  children,
  footer,
  ...nav
}: ProfileWorkspaceProps<T>) {
  const ids = profileSectionIds(nav.idPrefix, nav.value);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '232px minmax(0, 1fr)' },
        gap: { xs: 2, md: 3 },
        alignItems: 'start',
      }}
    >
      <ProfileSectionNav {...nav} />
      <Box sx={{ minWidth: 0 }}>
        <Box role="tabpanel" id={ids.panel} aria-labelledby={ids.tab}>
          {children}
        </Box>
        {footer}
      </Box>
    </Box>
  );
}
