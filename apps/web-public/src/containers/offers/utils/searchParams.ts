export type OffersSearchParams = {
  q?: string | string[];
  category?: string | string[];
  page?: string | string[];
};

export type OffersQuery = {
  q: string;
  /** The category KEY from the URL — readable, shareable, indexable. */
  category: string | null;
  /** Zero-based, matching the RPC's offset arithmetic. */
  page: number;
};

/** How many cards a page of the directory holds. */
export const OFFERS_PAGE_SIZE = 12;

/** Next hands a repeated parameter back as an array; take the first. */
function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * The URL, normalised once.
 *
 * Normalised HERE rather than at each reader for the reason the vendors
 * container gives about its own: a stale or hand-edited link must resolve to
 * exactly one query, or the page renders one thing and its canonical link
 * claims another.
 *
 * An unparseable page is page one rather than an error. `/offers?page=banana`
 * is a link somebody shared badly, not an attack, and a 404 for it costs a
 * visitor who did nothing wrong.
 */
export function parseOffersSearchParams(params: OffersSearchParams): OffersQuery {
  const rawPage = Number(first(params.page) ?? 0);

  return {
    q: (first(params.q) ?? '').trim().slice(0, 120),
    category: first(params.category),
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 0,
  };
}

/**
 * The canonical href for one state of this page.
 *
 * Built from the query rather than by mutating the current URL, so a filter
 * link always produces the same string for the same state — which is what lets
 * the page carry a truthful `canonical` and lets a crawler treat two routes to
 * the same view as one page.
 *
 * Page one never carries `page=0`. A parameter whose only value is the default
 * is a second URL for the same content.
 */
export function offersHref(query: Partial<OffersQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.category) params.set('category', query.category);
  if (query.page && query.page > 0) params.set('page', String(query.page));

  const search = params.toString();
  return search ? `/offers?${search}` : '/offers';
}
