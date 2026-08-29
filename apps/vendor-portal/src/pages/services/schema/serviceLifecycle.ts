import type { ServiceModel } from '@/lib/types';

/**
 * Where a service stands, as one word.
 *
 * The row carries two independent flags and the vendor thinks in one:
 *
 *   deleted_at set    → ARCHIVED. Out of the catalogue entirely.
 *   is_active false   → HIDDEN.   In the catalogue, invisible to clients.
 *   otherwise         → LIVE.     On the profile, findable in search.
 *
 * Archived beats hidden because it is the stronger statement: a service the
 * vendor archived while it happened to be hidden is archived, and reporting it
 * as hidden would offer them a "Show" button that puts nothing back on their
 * profile.
 */
export type ServiceState = 'live' | 'hidden' | 'archived';

export function serviceState(
  service: Pick<ServiceModel, 'is_active' | 'deleted_at'>,
): ServiceState {
  if (service.deleted_at) return 'archived';
  return service.is_active === false ? 'hidden' : 'live';
}

/** Which slice of the catalogue the toolbar is showing. */
export type ServiceFilter = 'all' | ServiceState;

export const SERVICE_FILTERS: { value: ServiceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'archived', label: 'Archived' },
];

/**
 * ALL DELIBERATELY EXCLUDES ARCHIVED.
 *
 * "All" is the vendor's catalogue — everything they are still offering,
 * whether clients can see it or not. An archived service is one they took out
 * of it, and folding those back into the default view would mean a vendor who
 * tidied up last month opens this screen to the same clutter they cleared.
 * Archived is a drawer they open on purpose, and the tab count is what tells
 * them there is anything in it.
 */
export function matchesServiceFilter(
  service: Pick<ServiceModel, 'is_active' | 'deleted_at'>,
  filter: ServiceFilter,
): boolean {
  const state = serviceState(service);
  return filter === 'all' ? state !== 'archived' : state === filter;
}

/**
 * Whether this service may be archived yet, and why not.
 *
 * The rule is about PUBLISHED packages only. A published package is a priced
 * offer a client can see right now; archiving the service it is filed under
 * leaves that offer live on the profile under a catalogue line the vendor has
 * retired, which is the one outcome neither of them can see from where they
 * are standing. So the archive is refused until those packages are unpublished
 * or moved.
 *
 * Drafts do not block it. Nothing about them is on a client's screen, and —
 * because `trg_soft_delete` means the row is never physically deleted — the
 * `on delete set null` on `quote_templates.vendor_service_id` never fires, so
 * a draft keeps its link and comes back intact if the service is restored.
 */
export type ArchiveVerdict =
  | { canArchive: true }
  | { canArchive: false; reason: 'checking' | 'published-packages'; publishedCount: number };

export function canArchiveService(
  pricing: { publishedCount: number },
  pricingLoading: boolean,
): ArchiveVerdict {
  if (pricingLoading) return { canArchive: false, reason: 'checking', publishedCount: 0 };
  if (pricing.publishedCount > 0) {
    return {
      canArchive: false,
      reason: 'published-packages',
      publishedCount: pricing.publishedCount,
    };
  }
  return { canArchive: true };
}
