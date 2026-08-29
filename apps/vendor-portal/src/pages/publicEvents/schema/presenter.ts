import { formatMoney } from '@/lib/config';
import type { EventFacetCounts, PublicEventModel } from '@/lib/types';
import { PANEL_FACET_KEYS, SOURCE_OPTIONS, type FacetValues } from './filters';

/**
 * Presentation logic for the public-events feed — every derivation the cards
 * and the tab bar need, kept out of the components that render them.
 *
 * Pure functions over the RPC's row shape: no React, no theme, no formatting
 * beyond the shared money/date helpers. That is what makes the card components
 * structural, and what makes the rules below (what "soon" means, when a budget
 * row earns its place) reviewable in one file instead of five.
 */

/**
 * The stated budget as a range, a floor, or a ceiling depending on what the
 * poster actually filled in. Null rather than a placeholder keeps the row off
 * the card entirely — "Budget: —" is noise on a brief that simply doesn't
 * quote one.
 */
export function budgetLabel(event: PublicEventModel): string | null {
  const { budget_min: min, budget_max: max, currency } = event;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) {
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
  }
  if (min != null && max != null) return formatMoney(min, currency);
  if (min != null) return `From ${formatMoney(min, currency)}`;
  return `Up to ${formatMoney(max, currency)}`;
}

/**
 * Whole calendar days from today to `iso`, or null if it isn't a date.
 *
 * Built from local date parts rather than `new Date(iso)`: the RPC returns a
 * bare `YYYY-MM-DD`, which `Date` parses as *UTC* midnight, so anywhere west of
 * Greenwich an event dated today reads as yesterday. Both sides are pinned to
 * local midnight so the answer is a difference in calendar days, not in hours.
 */
function daysUntil(iso: string): number | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!parts) return null;
  const target = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Rounded, not floored: a DST boundary inside the span shifts the difference
  // by an hour, which would otherwise silently lose a day.
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/**
 * How close an event is, as a tone the card colours a pill with.
 *
 * `urgent` is the seven-day window — the point at which a vendor either pitches
 * now or doesn't pitch at all — and it is the only tone that spends a colour.
 * Everything further out is deliberately quiet: a feed where every card shouts
 * is a feed where nothing does.
 */
export type EventUrgencyTone = 'urgent' | 'soon' | 'scheduled' | 'past';

export type EventUrgency = { label: string; tone: EventUrgencyTone };

export function eventUrgency(eventDate: string | null): EventUrgency | null {
  if (!eventDate) return null;
  const days = daysUntil(eventDate);
  if (days === null) return null;

  if (days < 0) return { label: 'Past event', tone: 'past' };
  if (days === 0) return { label: 'Today', tone: 'urgent' };
  if (days === 1) return { label: 'Tomorrow', tone: 'urgent' };
  if (days <= 7) return { label: `In ${days} days`, tone: 'urgent' };
  if (days <= 30) return { label: `In ${Math.round(days / 7)} weeks`, tone: 'soon' };
  return { label: `In ${Math.round(days / 30)} months`, tone: 'scheduled' };
}

/** Whether this vendor can act on the event at all — admin posts are inspiration. */
export function isActionable(event: PublicEventModel): boolean {
  return event.source === 'client';
}

/**
 * Which of the cover placeholder's gradients an image-less event gets.
 *
 * Keyed off the occasion so every wedding shares a wash and the grid reads as
 * grouped rather than random, and falls back to the id so two untyped events
 * still differ. Deterministic by design: a card that reshuffles its colour on
 * every re-render is worse than one with no colour at all.
 */
export function coverAccentIndex(event: PublicEventModel, buckets: number): number {
  const seed = event.event_type ?? event.id;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003;
  return hash % buckets;
}

/**
 * How many filters the collapsed panel is holding — the number its toggle
 * badges.
 *
 * Deliberately not `EventFilters.activeCount`: that one counts every facet in
 * the URL, and source no longer lives in the panel. Badging a filter the panel
 * doesn't contain sends a vendor looking for a control that isn't there.
 */
export function panelFilterCount(values: FacetValues): number {
  return PANEL_FACET_KEYS.reduce((count, key) => count + (values[key] ? 1 : 0), 0);
}

export type SourceTabOption = { value: string; label: string; count?: number };

/**
 * The source facet as a tab bar: All, then each source with its result count.
 *
 * Source is promoted out of the dropdown row because it is the one facet that
 * changes what a vendor can *do* — admin events take no expression of interest
 * — so it is a mode, not a way of narrowing. "All" carries no token and clears
 * the filter; the counts come from `count_event_facets_public`, which ignores
 * a facet's own selection, so All's total is their sum and stays correct
 * whichever tab is open.
 */
export function sourceTabOptions(counts?: EventFacetCounts['source']): SourceTabOption[] {
  const withCount = SOURCE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    count: counts?.[option.value],
  }));

  return [
    {
      value: '',
      label: 'All events',
      count: counts
        ? withCount.reduce((total, option) => total + (option.count ?? 0), 0)
        : undefined,
    },
    ...withCount,
  ];
}
