import type { Theme } from '@mui/material/styles';

/**
 * `sx` for a row of `Tabs` that wraps onto a second line on phones instead of
 * scrolling sideways. A scrolling row hides its last tabs behind a small ›
 * arrow, and a first-time user reads what they can see as everything there is.
 *
 * MUI's sliding indicator assumes one line, so below `sm` it is hidden and the
 * selected tab draws its own underline. From `sm` up nothing changes.
 *
 * Use as `sx={[wrapTabsOnPhoneSx, { ...yourSx }]}`.
 */
export const wrapTabsOnPhoneSx = (t: Theme) => ({
  [t.breakpoints.down('sm')]: {
    '& .MuiTabs-scroller': { overflow: 'visible !important' },
    '& .MuiTabs-flexContainer': { flexWrap: 'wrap', rowGap: 0.5 },
    '& .MuiTabs-scrollButtons': { display: 'none' },
    '& .MuiTabs-indicator': { display: 'none' },
    '& .MuiTab-root': {
      minWidth: 0,
      px: 1.5,
      borderBottom: '2px solid transparent',
    },
    '& .MuiTab-root.Mui-selected': { borderBottomColor: t.palette.primary.main },
  },
});
