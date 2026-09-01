import { useEffect, useState } from 'react';
import { useVendorRecommendations } from '@/hooks/queries';
import type { EventRequirementModel } from '@/lib/types';

export type RecommendationFilters = {
  onlyAvailable: boolean;
  withinBudget: boolean;
  matchRegion: boolean;
};

const NO_FILTERS: RecommendationFilters = {
  onlyAvailable: false,
  withinBudget: false,
  matchRegion: false,
};

/**
 * Suggestions for one budget line, and the three filters over them.
 *
 * ALL THREE FILTERS START OFF. Turning them on by default would look helpful
 * and would be the opposite: a client would open the panel, see four vendors
 * where twelve exist, and have no way to know that eight were removed by rules
 * nobody showed them. Off by default means the first thing they see is the
 * whole field, with each vendor's availability, budget fit and coverage stated
 * on its own card — and the filters are there to narrow it once they know what
 * they are narrowing.
 *
 * The line defaults to the first one still needing a vendor, because that is
 * what a client opening this panel came to fill. Selecting for them beats an
 * empty picker that asks a question they have already answered by being here.
 */
export function useRecommendations(eventId: string, requirements: EventRequirementModel[]) {
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecommendationFilters>(NO_FILTERS);

  const selectable = requirements.filter((r) => !r.cancelled_at);

  // Seeds once, then leaves the client's choice alone — the dependency is the
  // list, not the selection, so a refetch that reorders lines cannot yank the
  // panel onto a different one mid-read.
  useEffect(() => {
    if (requirementId) return;
    const firstOpen = selectable.find((r) => r.state === 'open') ?? selectable[0];
    if (firstOpen) setRequirementId(firstOpen.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements]);

  const query = useVendorRecommendations(eventId, requirementId, filters);

  const toggle = (key: keyof RecommendationFilters) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  return {
    requirementId,
    setRequirementId,
    requirements: selectable,
    selected: selectable.find((r) => r.id === requirementId) ?? null,
    filters,
    toggle,
    activeFilterCount: Object.values(filters).filter(Boolean).length,
    rows: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  };
}
