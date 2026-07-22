import { cache } from 'react';
import { QueryClient } from '@tanstack/react-query';

/**
 * The server's QueryClient, for prefetching data a client component will pick
 * up through `<HydrationBoundary>`.
 *
 * `cache()` scopes it to a single request: every Server Component in one render
 * shares the instance (so a page and a nested section can prefetch into the same
 * dehydrated payload), and two concurrent visitors never do. A module-level
 * singleton here would leak one visitor's results into another's HTML — the one
 * genuinely dangerous way to get this wrong.
 *
 * `staleTime` matters even for a client that lives for a few milliseconds: with
 * the default of 0 every prefetched query is born stale, so the browser would
 * refetch on mount everything the server just sent. It mirrors the browser
 * client's setting in `app/providers.tsx`.
 */
export const getQueryClient = cache(
  () =>
    new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    }),
);
