'use client';
import { Box } from '@mui/material';
import type { ProfileSectionState } from '../types';

/** Off-screen but still read aloud — the standard visually-hidden recipe. */
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
  padding: 0,
  margin: '-1px',
} as const;

const COLOR: Record<ProfileSectionState, string> = {
  error: 'error.main',
  dirty: 'secondary.main',
  attention: 'warning.main',
};

const LABEL: Record<ProfileSectionState, string> = {
  error: 'has errors',
  dirty: 'unsaved changes',
  attention: 'needs attention',
};

/**
 * The small flag beside a section's name in `ProfileSectionNav`.
 *
 * Colour alone would be invisible to a screen reader and ambiguous to anyone who
 * can't tell gold from amber, so the state is also spelled out in hidden text that
 * becomes part of the tab's accessible name.
 */
export function SectionStateDot({ state }: { state: ProfileSectionState }) {
  return (
    <>
      <Box
        aria-hidden
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: COLOR[state],
          boxShadow: (t) => `0 0 0 2px ${t.palette.background.paper}`,
        }}
      />
      <Box component="span" sx={visuallyHidden}>
        {` — ${LABEL[state]}`}
      </Box>
    </>
  );
}
