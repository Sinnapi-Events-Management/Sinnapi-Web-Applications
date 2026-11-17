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
    // Pills that wrap, rather than tab labels that wrap. A second row of bare
    // labels ("No longer offered (0)" alone on its own line) read as broken;
    // chips on two rows read as a set of choices — the same look as the
    // quick-view chips on the Bookings, Quotations and Invoices lists.
    // (2026-11-17)
    '& .MuiTabs-flexContainer': { flexWrap: 'wrap', gap: '6px', py: 1 },
    '& .MuiTabs-scrollButtons': { display: 'none' },
    '& .MuiTabs-indicator': { display: 'none' },
    '& .MuiTab-root': {
      minWidth: 0,
      minHeight: 40,
      px: 1.5,
      py: 0.5,
      borderRadius: 999,
      border: `1px solid ${t.palette.divider}`,
      fontSize: '0.875rem',
      color: t.palette.text.primary,
    },
    '& .MuiTab-root.Mui-selected': {
      bgcolor: t.palette.primary.main,
      borderColor: t.palette.primary.main,
      color: t.palette.primary.contrastText,
    },
  },
});
