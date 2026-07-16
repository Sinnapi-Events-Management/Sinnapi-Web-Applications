import type { SortModel } from '@sinnapi/ui';

// Shared contract for every server-paginated admin list. Queries receive
// `PageParams` (zero-based page, size, optional sort) and return a `Paged`
// result carrying the current page's rows plus the total row count so the
// DataTable can render server-driven pagination.
/**
 * Column → value equality filters applied server-side before pagination. An
 * `undefined`/empty value means "no filter on this column", so an unfiltered
 * list and a cleared filter produce the same query.
 */
export type PageFilters = Record<string, string | undefined>;

export type PageParams = {
  page: number;
  pageSize: number;
  sort?: SortModel;
  filters?: PageFilters;
};

export type Paged<Row> = {
  rows: Row[];
  total: number;
};

export type OrderDefault = { field: string; ascending: boolean };

/** Zero-based page → inclusive Supabase `.range()` bounds. */
export function pageRange({ page, pageSize }: PageParams): { from: number; to: number } {
  const from = page * pageSize;
  return { from, to: from + pageSize - 1 };
}

/**
 * Resolve the column/direction to pass to `.order()`. Falls back to the query's
 * default ordering when the user has not chosen a sortable column.
 */
export function orderBy(sort: SortModel | undefined, fallback: OrderDefault): OrderDefault {
  if (!sort) return fallback;
  return { field: sort.field, ascending: sort.direction === 'asc' };
}

// The `.eq()` we depend on. Constraining `applyFilters` to this shape would
// force TS to structurally check Supabase's builder — whose `eq` is generic
// over column names and returns `this` — and that instantiates too deeply
// (TS2589). So the shape is asserted inside the helper instead, and the generic
// stays unconstrained to hand callers back their exact builder type.
type FilterableQuery = {
  eq: (column: string, value: string) => FilterableQuery;
};

/**
 * Apply `PageFilters` to a select query as chained `.eq()` calls, skipping
 * columns with no value. Feed the result to `paginate` so filtering happens
 * server-side and is reflected in the `exact` count that drives pagination.
 */
export function applyFilters<Q>(query: Q, filters?: PageFilters): Q {
  if (!filters) return query;
  return Object.entries(filters).reduce<unknown>(
    (q, [column, value]) => (value ? (q as FilterableQuery).eq(column, value) : q),
    query,
  ) as Q;
}

// Minimal structural shape of the Supabase query builder we depend on: applying
// an order then a range yields a thenable carrying the page rows + exact count.
type PageQuery = {
  order: (column: string, options: { ascending: boolean }) => PageQuery;
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; count: number | null }>;
};

/**
 * Apply server-side ordering + range to a `select(..., { count: 'exact' })`
 * query and normalise the response into a `Paged` result. This is the single
 * place the range/count wiring lives so every admin list behaves identically.
 */
export async function paginate<Row>(
  query: PageQuery,
  params: PageParams,
  fallback: OrderDefault,
): Promise<Paged<Row>> {
  const { field, ascending } = orderBy(params.sort, fallback);
  const { from, to } = pageRange(params);
  const { data, count } = await query.order(field, { ascending }).range(from, to);
  return { rows: (data ?? []) as Row[], total: count ?? 0 };
}
