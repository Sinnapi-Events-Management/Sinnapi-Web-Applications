import type { FacetOption } from '../molecules/FacetSelect';
import type { IsoDateRange } from '../molecules/datePicker/isoDate';
import type { RangePreset } from '../molecules/datePicker/presets';
import { FUTURE_RANGE_PRESETS } from '../molecules/datePicker/presets';
import { titleizeStatus } from '../molecules/statusColor';
import type { PageFilters } from './table';

// The list search + filter contract shared by the vendor and client portals'
// Bookings and Quotations lists.
//
// Split three ways so the pieces stay where their dependencies allow:
//   * this file  — types, vocabularies, pure helpers (no React, no router);
//   * `@sinnapi/ui/router` → `useListFilters` / `useSearchTerm` — URL state;
//   * `ListToolbar` / `ListFilterChips` — presentational, read only these types.

/** A debounced, URL-mirrored search term. Produced by `useSearchTerm`. */
export type SearchTerm = {
  /** Live field value — bind to the controlled input. */
  input: string;
  setInput: (next: string) => void;
  /** Debounced, trimmed term to hand to a query; `undefined` when empty. */
  query: string | undefined;
  /** Apply what's typed right now, skipping the rest of the debounce window. */
  flush: () => void;
  clear: () => void;
  /** A debounce window is open: what's on screen is about to be replaced. */
  isPending: boolean;
  /** Shortest term that is actually sent. */
  minLength: number;
  /** Something is typed, but fewer than `minLength` characters — not searched. */
  tooShort: boolean;
};

export type ListFacetConfig<K extends string = string> = {
  /** URL param and `PageFilters` key. */
  key: K;
  label: string;
  /** Copy for the "no constraint" entry, e.g. "All statuses". */
  anyLabel: string;
  options: FacetOption[];
  /**
   * Sits on the toolbar row beside the search box rather than inside the
   * folding panel. Reserve it for the one filter used on nearly every visit.
   */
  inline?: boolean;
};

export type ListFilterConfig<K extends string = string> = {
  /** DOM id for the filter panel (toggle `aria-controls`). Unique per page. */
  id: string;
  searchPlaceholder: string;
  searchLabel: string;
  facets: ListFacetConfig<K>[];
  /** Omit for a list with no date filter. The label names WHICH date. */
  dateRange?: { label: string; presets?: RangePreset[] };
};

/** `{ facet: { optionValue: rowCount } }`, as the `*_list_facets` RPCs report. */
export type ListFacetCounts = Record<string, Record<string, number>>;

/** Everything a list toolbar reads and writes. Produced by `useListFilters`. */
export type ListFilterState<K extends string = string> = {
  config: ListFilterConfig<K>;
  search: SearchTerm;
  values: Record<K, string>;
  setFacet: (key: K, value: string) => void;
  dateRange: IsoDateRange;
  setDateRange: (next: IsoDateRange) => void;
  /** Facets + date range narrowing the list (the search term not included). */
  activeCount: number;
  /** Anything at all narrowing the list, search included. */
  isFiltered: boolean;
  /** Clears facets, date range AND search in one step. */
  clearAll: () => void;
  /**
   * The committed filters, shaped for `PageParams.filters`: `q`, each facet key,
   * `from`, `to`. Absent keys mean "no constraint". Stable between changes.
   *
   * Paced: the search part after `LIST_TIMING.searchDebounceMs`, the facet and
   * date part after `LIST_TIMING.filterDebounceMs`. The controls (`values`,
   * `dateRange`, `search.input`) are never delayed — only this.
   */
  query: PageFilters;
  /** `query`, held back a further `LIST_TIMING.countsDelayMs` for the counts call. */
  countsQuery: PageFilters;
  /** A search or filter change is waiting out its window; the rows are stale. */
  isPending: boolean;
};

/** RPC rows `{ facet, value, n }[]` → `ListFacetCounts`. */
export function toFacetCounts(
  rows: ReadonlyArray<{ facet: string; value: string | null; n: number | string }> | null,
): ListFacetCounts {
  const out: ListFacetCounts = {};
  for (const row of rows ?? []) {
    if (row.value == null) continue;
    (out[row.facet] ??= {})[row.value] = Number(row.n);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vocabularies. One copy for both portals, so a status label never reads one
// way to the vendor and another to the client. Status labels come from
// `titleizeStatus` — the same words the StatusChip in the row shows.
// ---------------------------------------------------------------------------

const statusOptions = (values: readonly string[]): FacetOption[] =>
  values.map((value) => ({ value, label: titleizeStatus(value) }));

/** `booking_status`, in lifecycle order. */
export const BOOKING_STATUS_OPTIONS = statusOptions([
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'declined',
]);

/** `quotation_status`, in lifecycle order. `voided` reads "Cancelled". */
export const QUOTATION_STATUS_OPTIONS = statusOptions([
  'requested',
  'draft',
  'sent',
  'revised',
  'accepted',
  'declined',
  'expired',
  'voided',
]);

/** `payment_type`, worded as PaymentTermsChip words it. */
export const PAYMENT_TYPE_OPTIONS: FacetOption[] = [
  { value: 'escrow', label: 'Sinnapi escrow' },
  { value: 'direct', label: 'Off platform' },
];

/** `payment_terms_status`, worded as PaymentTermsChip's tooltip explains it. */
export const PAYMENT_TERMS_STATUS_OPTIONS: FacetOption[] = [
  { value: 'proposed', label: 'Waiting for an answer' },
  { value: 'accepted', label: 'Agreed' },
  { value: 'countered', label: 'Different terms proposed' },
  { value: 'declined', label: 'Not agreed' },
];

export type BookingFilterKey = 'status' | 'payment_type' | 'terms_status';
export type QuotationFilterKey = 'status';

/** Search + filters for a Bookings list. Same in both portals. */
export const BOOKING_LIST_FILTERS: ListFilterConfig<BookingFilterKey> = {
  id: 'bookings-filters',
  searchPlaceholder: 'Search by reference, name, event or place…',
  searchLabel: 'Search bookings',
  facets: [
    {
      key: 'status',
      label: 'Status',
      anyLabel: 'All statuses',
      options: BOOKING_STATUS_OPTIONS,
      inline: true,
    },
    {
      key: 'payment_type',
      label: 'Payment',
      anyLabel: 'Any payment',
      options: PAYMENT_TYPE_OPTIONS,
    },
    {
      key: 'terms_status',
      label: 'Payment terms',
      anyLabel: 'Any terms',
      options: PAYMENT_TERMS_STATUS_OPTIONS,
    },
  ],
  dateRange: { label: 'Event date', presets: FUTURE_RANGE_PRESETS },
};

/** Search + filters for a Quotations list. Same in both portals. */
export const QUOTATION_LIST_FILTERS: ListFilterConfig<QuotationFilterKey> = {
  id: 'quotations-filters',
  searchPlaceholder: 'Search by reference, name, event or place…',
  searchLabel: 'Search quotations',
  facets: [
    {
      key: 'status',
      label: 'Status',
      anyLabel: 'All statuses',
      options: QUOTATION_STATUS_OPTIONS,
      inline: true,
    },
  ],
  dateRange: { label: 'Event date', presets: FUTURE_RANGE_PRESETS },
};

// ---------------------------------------------------------------------------
// `PageFilters` → RPC arguments. One mapping for both portals, so the vendor
// and client lists can never send the functions different argument shapes.
// `vendorId` null = the client's own rows; a vendor id = that vendor's rows.
// ---------------------------------------------------------------------------

/** Arguments for `search_bookings` / `booking_list_facets`. */
export function bookingSearchArgs(vendorId: string | null, filters: PageFilters | undefined) {
  const f = filters ?? {};
  return {
    p_vendor_id: vendorId,
    p_search: f.q ?? null,
    p_status: f.status ?? null,
    p_payment_type: f.payment_type ?? null,
    p_terms_status: f.terms_status ?? null,
    p_date_from: f.from ?? null,
    p_date_to: f.to ?? null,
  };
}

/** Arguments for `search_quotations` / `quotation_list_facets`. */
export function quotationSearchArgs(vendorId: string | null, filters: PageFilters | undefined) {
  const f = filters ?? {};
  return {
    p_vendor_id: vendorId,
    p_search: f.q ?? null,
    p_status: f.status ?? null,
    p_date_from: f.from ?? null,
    p_date_to: f.to ?? null,
  };
}
