/**
 * Narrowing the agenda to the rows a vendor is actually looking for.
 *
 * The upcoming list mixes two kinds of row that read alike and behave nothing
 * alike: a manual block the vendor can lift, and a booking-derived block they
 * cannot. Scanning for "what have I closed off myself?" means reading past the
 * bookings, and vice versa — so the list takes a filter.
 *
 * Pure, and applied over `groupByMonth`'s output rather than over the raw rows:
 * the grouping already drops past dates and orders the months, and re-deriving
 * that per filter is how the filtered list ends up ordered differently from the
 * unfiltered one.
 */
import { isBookingBlock, type MonthGroup } from './calendarDays';

export type AgendaFilter = 'all' | 'manual' | 'booking';

/** The filter chips, in the order they are offered. */
export const AGENDA_FILTERS: { value: AgendaFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'manual', label: 'Blocked by you' },
  { value: 'booking', label: 'Bookings' },
];

export type AgendaCounts = Record<AgendaFilter, number>;

/**
 * How many upcoming rows each filter would show.
 *
 * Counted from the unfiltered groups so every chip carries its own total —
 * a chip that only knew the current filter's count could not tell a vendor
 * there is nothing behind it before they press it.
 */
export function countAgenda(groups: MonthGroup[]): AgendaCounts {
  const counts: AgendaCounts = { all: 0, manual: 0, booking: 0 };
  for (const group of groups) {
    for (const row of group.rows) {
      counts.all += 1;
      if (isBookingBlock(row)) counts.booking += 1;
      else counts.manual += 1;
    }
  }
  return counts;
}

/** The groups a filter leaves behind. A month emptied by the filter is dropped. */
export function filterAgenda(groups: MonthGroup[], filter: AgendaFilter): MonthGroup[] {
  if (filter === 'all') return groups;
  const wantBooking = filter === 'booking';
  const kept: MonthGroup[] = [];
  for (const group of groups) {
    const rows = group.rows.filter((row) => isBookingBlock(row) === wantBooking);
    // A month heading with nothing under it is noise, not structure.
    if (rows.length) kept.push({ ...group, rows });
  }
  return kept;
}

// An empty agenda is a normal state, not an error — say which list is empty, so
// a filtered-to-nothing view never reads as "nothing is coming up at all".
const EMPTY_MESSAGES: Record<AgendaFilter, string> = {
  all: 'Nothing blocked ahead — every upcoming day is bookable.',
  manual: "You haven't blocked any upcoming days yourself.",
  booking: 'No confirmed bookings ahead.',
};

export function agendaEmptyMessage(filter: AgendaFilter): string {
  return EMPTY_MESSAGES[filter];
}
