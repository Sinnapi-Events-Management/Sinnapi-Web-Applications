/**
 * One-tap range shortcuts.
 *
 * Filter toolbars are where a range picker earns its keep: "what happened last
 * week" is one click here versus two calendar navigations and two taps. The
 * presets are split by direction because the two kinds of range in the product
 * point opposite ways — an audit log is always historical, an events list is
 * usually forward-looking — and offering "Last 30 days" on a promotion window
 * is noise.
 */
import { addDays, endOfMonth, startOfMonth, startOfToday, toIsoDate } from './isoDate';
import type { IsoDateRange } from './isoDate';

export type RangePreset = {
  /** Stable key, also used as the React key. */
  id: string;
  label: string;
  /** Built on demand so a long-lived page never serves a stale "Today". */
  resolve: () => IsoDateRange;
};

const span = (from: Date, to: Date): IsoDateRange => ({ from: toIsoDate(from), to: toIsoDate(to) });

const today = (): RangePreset => ({
  id: 'today',
  label: 'Today',
  resolve: () => span(startOfToday(), startOfToday()),
});

const lastDays = (days: number): RangePreset => ({
  id: `last-${days}`,
  label: `Last ${days} days`,
  // Inclusive of today, so "Last 7 days" spans today and the six before it.
  resolve: () => span(addDays(startOfToday(), -(days - 1)), startOfToday()),
});

const nextDays = (days: number): RangePreset => ({
  id: `next-${days}`,
  label: `Next ${days} days`,
  resolve: () => span(startOfToday(), addDays(startOfToday(), days - 1)),
});

const thisMonth = (): RangePreset => ({
  id: 'this-month',
  label: 'This month',
  resolve: () => span(startOfMonth(startOfToday()), endOfMonth(startOfToday())),
});

/** For ranges that look backwards — audit trails, reports, activity logs. */
export const PAST_RANGE_PRESETS: RangePreset[] = [today(), lastDays(7), lastDays(30), thisMonth()];

/** For ranges that look forwards — event dates, promotion windows, availability. */
export const FUTURE_RANGE_PRESETS: RangePreset[] = [
  today(),
  nextDays(7),
  nextDays(30),
  thisMonth(),
];
