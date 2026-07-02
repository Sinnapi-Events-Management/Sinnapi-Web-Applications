import { MOCK_VENDORS } from '@/containers/vendors/data/mockVendors';
import { MOCK_EVENTS } from '@/containers/events/data/mockEvents';

/**
 * Server-side data loader for the home page. Keeps all data-fetching logic out
 * of the presentational container so the container stays a pure composition of
 * organisms.
 *
 * Sources the home sections from the shared mock datasets (imported, not
 * duplicated) while the live tables are empty: the "Featured vendors" rail shows
 * the six highest-rated mock vendors and "Events & inspiration" shows the first
 * three mock events. Both link to their detail pages, which resolve the same
 * mock records by slug / id. Swap these back to the live `getFeaturedVendors` /
 * `getEvents` queries once real data is available.
 */
export async function getHomeData() {
  const featured = [...MOCK_VENDORS].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 6);
  const events = MOCK_EVENTS.slice(0, 3);
  return { featured, events };
}
