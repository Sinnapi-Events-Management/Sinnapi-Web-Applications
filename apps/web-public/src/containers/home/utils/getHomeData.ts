import { listFeaturedVendors, listPublicEvents } from '@/lib/queries';

/**
 * Upper bound on the featured spotlight. The rail scrolls horizontally, so this
 * is a payload guard rather than a layout constraint — it can grow with the
 * number of paying vendors without the section growing taller. The RPC clamps
 * anything larger.
 */
const FEATURED_LIMIT = 24;

/** The inspiration strip is a three-card teaser; /events carries the full feed. */
const EVENTS_LIMIT = 3;

/**
 * Server-side data loader for the home page. Keeps all data-fetching logic out
 * of the presentational container so the container stays a pure composition of
 * organisms.
 *
 * Both sections come from dedicated Supabase RPCs — `list_featured_vendors_public`
 * and `list_public_events` — which own their own projection, visibility rules and
 * ordering. Nothing is ranked or filtered here: the two calls are independent, so
 * they run concurrently and the page pays for one round trip, not two.
 *
 * Empty results are a legitimate state (the sections render their own empty /
 * hidden treatment), so there is no mock fallback: the home page always reflects
 * what is actually published.
 */
export async function getHomeData() {
  const [featured, events] = await Promise.all([
    listFeaturedVendors(FEATURED_LIMIT),
    listPublicEvents(EVENTS_LIMIT),
  ]);

  return { featured, events };
}
