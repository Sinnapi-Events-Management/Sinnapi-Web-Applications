/**
 * The calendar grid's skin.
 *
 * react-day-picker ships a stylesheet, which we deliberately do not import: a
 * global CSS file from `node_modules` fights Next.js' app-router CSS rules, and
 * its palette is fixed, so the calendar would be the one surface in the product
 * that ignores the theme and the light/dark flip. Styling its class names from
 * `sx` instead means every colour, radius and font here comes from the same
 * tokens as the rest of the design system, and dark mode needs no extra work.
 *
 * The selectors mirror react-day-picker v9's DOM (`rdp-*` class names on a real
 * `<table>`), so they are stable across patch releases of v9.
 */
import { alpha, type Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/material';

/** Edge of one day cell. `compact` is for popovers showing two months at once. */
const CELL = { comfortable: 40, compact: 36 } as const;

export type CalendarDensity = keyof typeof CELL;

export function calendarSx(density: CalendarDensity = 'comfortable'): SxProps<Theme> {
  const cell = CELL[density];

  return (theme: Theme) => {
    const selectedBg = theme.palette.primary.main;
    const selectedInk = theme.palette.primary.contrastText;
    // The range band sits *behind* the day buttons, so it has to stay pale
    // enough for body text to clear contrast in both schemes.
    const band = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.12);

    return {
      // ---- shell -------------------------------------------------------
      '& .rdp-root': {
        '--rdp-cell': `${cell}px`,
        display: 'inline-block',
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.pxToRem(14),
        color: theme.palette.text.primary,
      },
      '& .rdp-months': {
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(3),
      },

      // ---- month header + navigation -----------------------------------
      // The nav floats across the top of the whole months row so a two-month
      // view gets one pair of arrows at the outer edges, not two pairs.
      '& .rdp-nav': {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: cell,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
      },
      '& .rdp-button_previous, & .rdp-button_next': {
        pointerEvents: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        border: 0,
        borderRadius: '50%',
        background: 'transparent',
        color: theme.palette.text.secondary,
        cursor: 'pointer',
        transition: theme.transitions.create(['background-color', 'color']),
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          color: theme.palette.text.primary,
        },
        '&[aria-disabled="true"]': {
          color: theme.palette.text.disabled,
          cursor: 'default',
          '&:hover': { backgroundColor: 'transparent' },
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      },
      '& .rdp-chevron': { fill: 'currentColor', width: 18, height: 18 },

      '& .rdp-month_caption': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: cell,
        margin: 0,
      },
      '& .rdp-caption_label': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing(0.25),
        border: 0,
        padding: theme.spacing(0.5, 1),
        borderRadius: theme.shape.borderRadius,
        fontSize: theme.typography.pxToRem(15),
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: theme.palette.text.primary,
      },
      // Month/year dropdowns: a transparent native <select> laid over the label,
      // so the control keeps the browser's accessible picker while looking like
      // plain text with a chevron.
      '& .rdp-dropdowns': { display: 'inline-flex', alignItems: 'center', gap: theme.spacing(0.5) },
      '& .rdp-dropdown_root': { position: 'relative', display: 'inline-flex' },
      '& .rdp-dropdown': {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        cursor: 'pointer',
        appearance: 'none',
        border: 0,
      },
      '& .rdp-dropdown_root:hover .rdp-caption_label': {
        backgroundColor: theme.palette.action.hover,
      },
      '& .rdp-dropdown:focus-visible + .rdp-caption_label': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },

      // ---- grid --------------------------------------------------------
      // `collapse` is what lets a selected range read as one unbroken band
      // instead of a row of tinted squares with hairlines between them.
      '& .rdp-month_grid': { borderCollapse: 'collapse', borderSpacing: 0 },
      '& .rdp-weekday': {
        width: cell,
        height: 32,
        padding: 0,
        fontSize: theme.typography.pxToRem(11),
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: theme.palette.text.secondary,
      },

      // ---- days --------------------------------------------------------
      '& .rdp-day': {
        width: cell,
        height: cell,
        padding: 0,
        textAlign: 'center',
        verticalAlign: 'middle',
      },
      '& .rdp-day_button': {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: cell - 4,
        height: cell - 4,
        margin: 0,
        padding: 0,
        border: 0,
        borderRadius: '50%',
        background: 'transparent',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        transition: theme.transitions.create(['background-color', 'color'], {
          duration: theme.transitions.duration.shortest,
        }),
        '&:hover': { backgroundColor: theme.palette.action.hover },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2,
        },
      },
      '& .rdp-outside': { color: theme.palette.text.disabled },
      '& .rdp-disabled': {
        color: theme.palette.text.disabled,
        '& .rdp-day_button': { cursor: 'not-allowed', '&:hover': { background: 'transparent' } },
      },
      '& .rdp-hidden': { visibility: 'hidden' },

      // Today is marked with a ring rather than a fill, so it can't be mistaken
      // for the selection — and the ring is the brand gold, not another teal.
      '& .rdp-today:not(.rdp-selected) .rdp-day_button': {
        fontWeight: 700,
        boxShadow: `inset 0 0 0 1.5px ${theme.palette.secondary.main}`,
      },

      // ---- selection ---------------------------------------------------
      '& .rdp-selected:not(.rdp-range_middle) .rdp-day_button': {
        backgroundColor: selectedBg,
        color: selectedInk,
        fontWeight: 600,
        '&:hover': { backgroundColor: theme.palette.primary.dark },
      },
      '& .rdp-range_middle': {
        backgroundColor: band,
        '& .rdp-day_button': {
          backgroundColor: 'transparent',
          color: theme.palette.text.primary,
          borderRadius: 0,
          width: cell,
          height: cell,
          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.28) },
        },
      },
      // The band is drawn on the cell and rounded off at whichever end it stops.
      // A one-day range carries both classes, so it rounds on both sides.
      '& .rdp-range_start': {
        backgroundColor: band,
        borderTopLeftRadius: '50%',
        borderBottomLeftRadius: '50%',
      },
      '& .rdp-range_end': {
        backgroundColor: band,
        borderTopRightRadius: '50%',
        borderBottomRightRadius: '50%',
      },

      // ---- app-supplied modifiers --------------------------------------
      // `booked` marks days the vendor calendar owns but cannot edit; `blocked`
      // marks its own manual blocks. Both are dots under the number so the
      // selection colours stay free for the selection itself.
      //
      // The dot hangs off the day *cell*, not the day button: a calendar with
      // no selection handler renders its days as bare text with no button to
      // hang anything on, and the markers have to survive that.
      '& .rdp-blocked, & .rdp-booked': {
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 3,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 4,
          height: 4,
          borderRadius: '50%',
          // Above the selection fill, which is painted on the button beneath.
          zIndex: 1,
        },
      },
      '& .rdp-blocked::after': { backgroundColor: theme.palette.error.main },
      '& .rdp-booked::after': { backgroundColor: theme.palette.secondary.main },
      // On a selected day the dot has the fill behind it, so it flips to the ink.
      '& .rdp-selected::after': { backgroundColor: selectedInk },
    };
  };
}
