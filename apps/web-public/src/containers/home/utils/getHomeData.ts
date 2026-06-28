import { getFeaturedVendors, getEvents } from '@/lib/queries';

/**
 * Server-side data loader for the home page. Keeps all data-fetching logic out
 * of the presentational container so the container stays a pure composition of
 * organisms. Runs on the server (server-only Supabase client) and is consumed
 * by the async HomeContainer under ISR.
 */
export async function getHomeData() {
  const [featured, events] = await Promise.all([getFeaturedVendors(6), getEvents(3)]);
  return { featured, events };
}
