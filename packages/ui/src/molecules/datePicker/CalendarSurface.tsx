'use client';
/**
 * The one place react-day-picker is configured.
 *
 * Every calendar in the product — inline, in a popover, single or range — comes
 * through here, so the conventions that must not drift (Monday-first weeks, the
 * month/year dropdowns, the themed skin) are set once. Callers pass only what
 * makes their calendar different.
 */
import { useMemo, type ReactNode, type TdHTMLAttributes } from 'react';
import { Box, Tooltip } from '@mui/material';
import {
  DayPicker,
  labelDayButton,
  labelGridcell,
  type DayPickerProps,
  type DayProps,
  type Modifiers,
} from 'react-day-picker';
import { calendarSx, type CalendarDayEmphasis, type CalendarDensity } from './calendar.styles';
import {
  addMonths,
  endOfMonth,
  startOfMonth,
  startOfToday,
  toIsoDate,
  type IsoDate,
} from './isoDate';

/** How far the year dropdown reaches when the caller sets no bounds. */
const YEAR_REACH = 5;

/** Hover/focus detail for particular days, keyed by `YYYY-MM-DD`. */
export type DayTooltips = Record<IsoDate, ReactNode>;

/**
 * Words appended to a day's accessible name when a modifier is on it, keyed by
 * modifier name — `{ booked: 'Unavailable' }`.
 *
 * The markers this file draws are a fill and a hatch, which is nothing at all to
 * a screen reader: without this, a blocked day announces as "Thursday, 17
 * September 2026" exactly like the free day beside it, and the one piece of
 * information the calendar exists to convey is the one piece that never reaches
 * a non-sighted visitor. WCAG 1.4.1 is the rule; this is the other half of it.
 */
export type DayModifierLabels = Record<string, string>;

/**
 * The day cell, with its contents wrapped so a tooltip has something to anchor
 * to.
 *
 * Overriding `Day` (the `<td>`) rather than `DayButton` is deliberate: a
 * read-only calendar renders its days as bare text with no button at all, and a
 * tooltip that silently vanished on exactly those calendars would be a trap.
 * The wrapper is a flex box rather than `display: contents` — the popper needs a
 * real box to measure, and `contents` has none.
 */
function makeTooltipDay(tooltips: DayTooltips) {
  return function TooltipDay({ day, modifiers, children, ...tdProps }: DayProps) {
    const cellProps = tdProps as TdHTMLAttributes<HTMLTableCellElement>;
    const tip = tooltips[toIsoDate(day.date)];

    // Outside days are the neighbouring month's, drawn only to square off the
    // grid — describing them here would put the same tooltip on two cells. A
    // hidden day has no contents at all to anchor one to.
    if (!tip || day.outside || modifiers.hidden) return <td {...cellProps}>{children}</td>;

    return (
      <td {...cellProps}>
        {/* `enterTouchDelay: 0` because on a phone a tap is both the hover and
            the selection, and a delay means the detail never appears. */}
        <Tooltip title={tip} placement="top" arrow enterTouchDelay={0}>
          <span className="rdp-day_tip">{children}</span>
        </Tooltip>
      </td>
    );
  };
}

export type CalendarSurfaceProps = DayPickerProps & {
  density?: CalendarDensity;
  /** Stretch the grid to its container. Off by default — see `calendarSx`. */
  fullWidth?: boolean;
  /** How `blocked`/`booked` days read: a dot under the number, or a filled day. */
  dayEmphasis?: CalendarDayEmphasis;
  /**
   * Detail shown on hovering a day. Memoise it at the call site — a fresh object
   * every render would remount the whole grid and drop keyboard focus.
   */
  dayTooltips?: DayTooltips;
  /** Extra words for a marked day's accessible name. See `DayModifierLabels`. */
  dayModifierLabels?: DayModifierLabels;
};

export function CalendarSurface({
  density,
  fullWidth,
  dayEmphasis,
  dayTooltips,
  dayModifierLabels,
  labels,
  startMonth,
  endMonth,
  modifiers,
  modifiersClassNames,
  components,
  ...rest
}: CalendarSurfaceProps) {
  // The year dropdown builds its options from the navigable span, so it needs a
  // span even when the field itself is unbounded — otherwise it renders empty.
  const today = startOfToday();
  const navStart = startMonth ?? startOfMonth(addMonths(today, -12 * YEAR_REACH));
  const navEnd = endMonth ?? endOfMonth(addMonths(today, 12 * YEAR_REACH));

  // react-day-picker only emits a class for a *custom* modifier if it is told
  // which one — its built-in flags get `rdp-` names for free, but `blocked` and
  // friends would silently render as ordinary days. Naming them on the same
  // pattern is what lets the stylesheet above target them.
  const markerClassNames = modifiers
    ? Object.fromEntries(Object.keys(modifiers).map((name) => [name, `rdp-${name}`]))
    : undefined;

  // A caller's own overrides win: this only supplies `Day` when it has tooltips
  // to hang on one.
  const dayComponents = useMemo(
    () => (dayTooltips ? { Day: makeTooltipDay(dayTooltips), ...components } : components),
    [dayTooltips, components],
  );

  // Both label builders are wrapped, not just one: react-day-picker names the
  // `<button>` on an interactive calendar and the `<td>` on a read-only one, and
  // a marker that only announced on one of the two would be a silent gap on
  // whichever calendar the caller happened to build.
  const dayLabels = useMemo(() => {
    if (!dayModifierLabels) return labels;
    const suffix = (dayModifiers: Modifiers) =>
      Object.entries(dayModifierLabels)
        .filter(([name]) => dayModifiers[name])
        .map(([, label]) => label);
    const append = (base: string, dayModifiers: Modifiers) =>
      [base, ...suffix(dayModifiers)].join(', ');

    return {
      ...labels,
      labelDayButton: (date, dayModifiers, options, dateLib) =>
        append(labelDayButton(date, dayModifiers, options, dateLib), dayModifiers),
      labelGridcell: (date, dayModifiers, options, dateLib) =>
        append(
          labelGridcell(date, dayModifiers, options, dateLib),
          dayModifiers ?? ({} as Modifiers),
        ),
    } satisfies DayPickerProps['labels'];
  }, [dayModifierLabels, labels]);

  return (
    <Box sx={calendarSx({ density, fullWidth, dayEmphasis })}>
      <DayPicker
        labels={dayLabels}
        modifiers={modifiers}
        modifiersClassNames={{ ...markerClassNames, ...modifiersClassNames }}
        components={dayComponents}
        // Monday-first: the East-Africa convention, and the one the rest of the
        // product's date language already assumes.
        weekStartsOn={1}
        showOutsideDays
        // Dropdown navigation turns "six months out" from six clicks into one.
        captionLayout="dropdown"
        startMonth={navStart}
        endMonth={navEnd}
        {...rest}
      />
    </Box>
  );
}
