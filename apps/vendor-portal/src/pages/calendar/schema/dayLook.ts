/**
 * The one place a day state is given a name and a colour.
 *
 * The grid tints a day, the strip counts it, the chip labels it and the legend
 * explains it — four surfaces that have to agree, so none of them chooses for
 * itself. The palette families (rather than literal colours) are what carries
 * the light/dark flip: `error.main` resolves per scheme, `#d32f2f` would not.
 */
import type { AccentColor } from '@sinnapi/ui';
import type { DayState } from './calendarDays';

export type DayLook = {
  label: string;
  /** Theme palette family — resolves correctly in both colour schemes. */
  accent: AccentColor;
};

export const DAY_LOOK: Record<DayState, DayLook> = {
  // Gold, matching the `booked` marker the design system already draws.
  booked: { label: 'Booked', accent: 'secondary' },
  blocked: { label: 'Blocked', accent: 'error' },
  open: { label: 'Open', accent: 'success' },
  past: { label: 'Past', accent: 'info' },
};

/** The legend under the grid. Ordered by how much a vendor cares about each. */
export const CALENDAR_LEGEND = [
  { color: `${DAY_LOOK.booked.accent}.main`, label: 'Confirmed booking' },
  { color: `${DAY_LOOK.blocked.accent}.main`, label: 'Blocked by you' },
] as const;
