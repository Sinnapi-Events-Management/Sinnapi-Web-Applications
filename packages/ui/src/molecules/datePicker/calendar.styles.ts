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

/**
 * Edge of one day cell. `compact` is for popovers showing two months at once;
 * `spacious` is for a calendar that *is* the page rather than a field's popover.
 */
const CELL = { comfortable: 40, compact: 36, spacious: 52 } as const;

/**
 * What `responsive` resolves to per breakpoint.
 *
 * A `spacious` grid is 7 × 52px ≈ 364px before the card's own padding, which is
 * wider than a 360px phone: the month either overflows its card or squeezes its
 * columns into tall thin slivers. Stepping the cell down at the two small
 * breakpoints keeps the day a roughly square tap target at every width, which is
 * the thing that actually has to hold — a 36px cell is still above the 24px
 * minimum for a pointer target.
 */
const RESPONSIVE_CELL = { xs: CELL.compact, sm: CELL.comfortable, md: CELL.spacious } as const;

export type CalendarDensity = keyof typeof CELL | 'responsive';

/**
 * How the `blocked`/`booked` markers read.
 *
 * `dot` is the default and the only thing a popover has room for. `solid` fills
 * the whole day with a tint of the marker's colour — the difference between
 * "there is a mark here somewhere" and seeing at a glance which half of a month
 * is spoken for, which is the entire job of a standalone availability grid.
 *
 * `hatched` is `solid` plus two cues that survive having no colour at all: a
 * diagonal rule over the cell and a line through the number. WCAG 1.4.1 is the
 * floor here — around one man in twelve cannot separate the gold fill from the
 * cream around it — but the real gain is that a struck-through date is the
 * convention every booking site already taught people to read as "not this one".
 */
export type CalendarDayEmphasis = 'dot' | 'solid' | 'hatched';

/**
 * The diagonal rule a `hatched` marker lays over a day.
 *
 * Exported because the legend under a hatched grid has to draw the same thing:
 * a key showing a plain gold dot beside cells that are gold *and* struck through
 * is a key that describes a different calendar.
 */
export function hatchGradient(main: string, dark: boolean): string {
  return `repeating-linear-gradient(135deg, transparent 0 4px, ${alpha(
    main,
    dark ? 0.5 : 0.34,
  )} 4px 5px)`;
}

/** The fill tint under a `solid`/`hatched` marker, in either scheme. */
export function markerTint(main: string, dark: boolean): string {
  return alpha(main, dark ? 0.3 : 0.16);
}

export type CalendarSkin = {
  density?: CalendarDensity;
  /**
   * Stretch the grid to its container instead of sitting at its natural width.
   *
   * Off by default because a popover sizes itself to the calendar; on for an
   * inline calendar, where the fixed-width grid would otherwise be a small
   * island pinned to the left of a wide card.
   */
  fullWidth?: boolean;
  dayEmphasis?: CalendarDayEmphasis;
};

/**
 * One cell-derived measurement, as a plain value or as an sx breakpoint object.
 *
 * Every size on the grid is a function of the cell edge, so `responsive` cannot
 * be a single number and each of them has to be derived three times. Routing
 * them all through one helper is what keeps the rules below readable and stops
 * the breakpoint list drifting between the nav, the caption and the days.
 */
function cellSize<T>(density: CalendarDensity, derive: (cell: number) => T): T | Record<string, T> {
  if (density !== 'responsive') return derive(CELL[density]);
  return {
    xs: derive(RESPONSIVE_CELL.xs),
    sm: derive(RESPONSIVE_CELL.sm),
    md: derive(RESPONSIVE_CELL.md),
  };
}

export function calendarSx({
  density = 'comfortable',
  fullWidth = false,
  dayEmphasis = 'dot',
}: CalendarSkin = {}): SxProps<Theme> {
  /** `size(c => …)` — the cell edge at whichever density is in force. */
  const size = <T>(derive: (cell: number) => T) => cellSize(density, derive);
  const marked = dayEmphasis !== 'dot';

  return (theme: Theme) => {
    const dark = theme.palette.mode === 'dark';
    const selectedBg = theme.palette.primary.main;
    const selectedInk = theme.palette.primary.contrastText;
    // The range band sits *behind* the day buttons, so it has to stay pale
    // enough for body text to clear contrast in both schemes.
    const band = alpha(theme.palette.primary.main, dark ? 0.24 : 0.12);

    // A full-width day is a wide cell, not a square, so a 50% radius would draw
    // a lozenge. Softened corners are what a rectangle wants instead.
    const dayRadius = fullWidth ? `${Number(theme.shape.borderRadius) * 1.25}px` : '50%';

    /** One marked day: a filled day in the marker's own hue. */
    const markedDay = (main: string, ink: string) => ({
      backgroundColor: markerTint(main, dark),
      color: ink,
      fontWeight: 600,
      // Deliberately no ring: `today` already owns an inset box-shadow, and two
      // rings on one day is noise. The fill alone carries the state.
      '&:hover': { backgroundColor: alpha(main, dark ? 0.38 : 0.24) },
      ...(dayEmphasis === 'hatched' && {
        backgroundImage: hatchGradient(main, dark),
        textDecoration: 'line-through',
        textDecorationThickness: 'from-font',
        textDecorationColor: alpha(ink, 0.75),
      }),
    });

    /**
     * Where a marked day's fill has to be painted, for both kinds of calendar.
     *
     * react-day-picker only renders a `DayButton` when the calendar is
     * interactive (`mode !== undefined || onDayClick !== undefined`); a
     * read-only one puts the number straight into the `<td>` as a bare text
     * node. Targeting only `.rdp-day_button` — as this file used to — meant a
     * read-only `solid` calendar had its dot suppressed *and* its fill applied
     * to an element that was never rendered, so it drew no marker at all. The
     * second selector is that missing case: the cell itself, but only when it
     * holds no button, so an interactive grid never gets both.
     */
    const markedTargets = (marker: string, main: string, ink: string) => ({
      [`& .rdp-${marker} .rdp-day_button`]: markedDay(main, ink),
      [`& .rdp-${marker}:not(:has(.rdp-day_button))`]: {
        ...markedDay(main, ink),
        borderRadius: dayRadius,
        // Fills the whole cell, padding included. Insetting it to match the
        // button version is not an option: `.rdp-day` carries a spacing-unit
        // padding of 16px inside a border-box height as small as 36px, so
        // clipping the fill to the content box would leave a 4px sliver.
      },
    });

    return {
      // ---- shell -------------------------------------------------------
      '& .rdp-root': {
        '--rdp-cell': size((cell) => `${cell}px`),
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : undefined,
        fontFamily: theme.typography.fontFamily,
        fontSize: theme.typography.pxToRem(14),
        color: theme.palette.text.primary,
      },
      '& .rdp-months': {
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(3),
        width: fullWidth ? '100%' : undefined,
      },
      // Each month claims an equal share of the row and may shrink below its
      // natural width — without `minWidth: 0` a flex item refuses to, and a
      // two-month view would overflow its card on a tablet.
      ...(fullWidth && {
        '& .rdp-month': { flex: '1 1 240px', minWidth: 0 },
      }),

      // ---- month header + navigation -----------------------------------
      // The nav floats across the top of the whole months row so a two-month
      // view gets one pair of arrows at the outer edges, not two pairs.
      '& .rdp-nav': {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: size((cell) => cell),
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
        height: size((cell) => cell),
        margin: 0,
      },
      '& .rdp-caption_label': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: theme.spacing(0.25),
        border: 0,
        padding: theme.spacing(0.5, 1),
        borderRadius: theme.shape.borderRadius,
        // Scales with the grid: a 17px caption over 36px cells is a headline on
        // top of a thumbnail.
        fontSize: fullWidth
          ? size((cell) => theme.typography.pxToRem(cell >= CELL.comfortable ? 17 : 15))
          : theme.typography.pxToRem(15),
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
      '& .rdp-month_grid': {
        borderCollapse: 'collapse',
        borderSpacing: 0,
        // `fixed` is what makes seven equal columns out of a percentage width;
        // `auto` would size them to their content and drift week to week.
        ...(fullWidth && { width: '100%', tableLayout: 'fixed' }),
      },
      '& .rdp-weekday': {
        width: fullWidth ? 'auto' : size((cell) => cell),
        height: 32,
        padding: 0,
        fontSize: theme.typography.pxToRem(11),
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: theme.palette.text.secondary,
      },
      // A rule under the weekday names separates the header from the dates —
      // needed once the grid is wide enough for the two to read as one block.
      ...(fullWidth && {
        '& .rdp-weekdays': {
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
      }),

      // ---- days --------------------------------------------------------
      '& .rdp-day': {
        width: fullWidth ? 'auto' : size((cell) => cell),
        height: size((cell) => cell),
        padding: fullWidth ? 2 : 0,
        textAlign: 'center',
        verticalAlign: 'middle',
      },
      '& .rdp-day_button': {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : size((cell) => cell - 4),
        height: size((cell) => (fullWidth ? cell - 6 : cell - 4)),
        margin: 0,
        padding: 0,
        border: 0,
        borderRadius: dayRadius,
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
      // The wrapper `CalendarSurface` puts around a day's contents when it has a
      // tooltip to anchor. Sized to the cell so the popper points at the day
      // rather than at a text node inside it, and flex-centred so it adds no
      // baseline gap under the button.
      '& .rdp-day_tip': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
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
          width: fullWidth ? '100%' : size((cell) => cell),
          height: size((cell) => cell),
          '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.28) },
        },
      },
      // The band is drawn on the cell and rounded off at whichever end it stops.
      // A one-day range carries both classes, so it rounds on both sides.
      '& .rdp-range_start': {
        backgroundColor: band,
        borderTopLeftRadius: dayRadius,
        borderBottomLeftRadius: dayRadius,
      },
      '& .rdp-range_end': {
        backgroundColor: band,
        borderTopRightRadius: dayRadius,
        borderBottomRightRadius: dayRadius,
      },

      // ---- app-supplied modifiers --------------------------------------
      // `booked` marks days the vendor calendar owns but cannot edit; `blocked`
      // marks its own manual blocks.
      //
      // In `dot` mode the marker is a dot under the number, so the selection
      // colours stay free for the selection itself. The dot hangs off the day
      // *cell*, not the day button: a calendar with no selection handler renders
      // its days as bare text with no button to hang anything on, and the
      // markers have to survive that.
      '& .rdp-blocked, & .rdp-booked': {
        position: 'relative',
        '&::after': {
          content: marked ? 'none' : '""',
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

      // In `solid`/`hatched` mode the whole day carries the tint. These sit last
      // so they beat `.rdp-disabled`'s greying — a blocked day is disabled
      // *because* it is blocked, and rendering it as ordinary dead space is
      // exactly the reason a vendor cannot see their own availability at a
      // glance. The selection (`:not(.rdp-range_middle)`, three classes) still
      // outranks them.
      ...(marked && {
        ...markedTargets(
          'blocked',
          theme.palette.error.main,
          dark ? theme.palette.error.light : theme.palette.error.dark,
        ),
        ...markedTargets(
          'booked',
          theme.palette.secondary.main,
          dark ? theme.palette.secondary.light : theme.palette.secondary.dark,
        ),
      }),
    };
  };
}
