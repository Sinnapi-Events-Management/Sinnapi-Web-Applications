import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEventVendorMutations, useVendorLookup } from '@/hooks/queries';
import type { EventRequirementModel, EventVendorModel, VendorOptionModel } from '@/lib/types';

/**
 * Whether a vendor lists the category a line is filed under — the browser's
 * copy of `vendor_serves_category` (migration 0901l): approved under it, or
 * offering an active service in it.
 *
 * A null category means no line was picked, and there is then nothing to judge.
 */
function servesCategory(vendor: VendorOptionModel, categoryId: string | null): boolean {
  if (!categoryId) return true;
  if (vendor.primary_category_id === categoryId) return true;
  return (vendor.vendor_services ?? []).some((s) => s.category_id === categoryId);
}

/**
 * Inviting a vendor to quote for this event.
 *
 * The search term is debounced before it reaches the lookup, the same way every
 * other typed query in this app is: "kampala" is seven keystrokes and would
 * otherwise be seven round trips for six answers nobody reads.
 *
 * Vendors already engaged on the chosen line are marked rather than hidden.
 * `invite_vendor_to_event` is idempotent, so inviting one twice is harmless —
 * but a client who cannot find a vendor they know they have already approached
 * concludes the search is broken, where "already invited" answers the question
 * they were actually asking.
 *
 * Vendors who do not list the chosen line's category are FLAGGED, NOT BLOCKED.
 * The vendor's own side of this is a hard gate — a photographer can no longer
 * volunteer for a makeup line — but a client approaching someone directly is a
 * judgement, not an accident: they may know the vendor does the work
 * off-catalogue, or want them for something not on the plan. So the server
 * still allows it and the dialog says what it noticed. Catching the misclick
 * without overriding the decision is the whole distinction.
 */
export function useInviteVendor(
  eventId: string,
  engaged: EventVendorModel[],
  requirements: EventRequirementModel[] = [],
) {
  const [query, setQuery] = useState('');
  const [requirementId, setRequirementId] = useState<string>('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const debounced = useDebouncedValue(query, 300);
  const lookup = useVendorLookup(debounced);
  const { invite } = useEventVendorMutations(eventId);

  /** The line being invited for, when one is chosen. */
  const requirement = useMemo(
    () => requirements.find((r) => r.id === requirementId) ?? null,
    [requirements, requirementId],
  );

  /**
   * Vendors in the list who do not list this line's category. Recomputed as the
   * line changes, so switching from Catering to Makeup re-flags the same rows
   * without a refetch.
   */
  const mismatchedIds = useMemo(() => {
    const category = requirement?.category_id ?? null;
    if (!category) return new Set<string>();
    return new Set(
      (lookup.data?.vendors ?? []).filter((v) => !servesCategory(v, category)).map((v) => v.id),
    );
  }, [lookup.data, requirement]);

  /** Vendor ids already engaged on the line being invited for. */
  const engagedIds = useMemo(() => {
    const scope = requirementId
      ? engaged.filter((r) => r.requirement_id === requirementId)
      : engaged;
    return new Set(scope.map((r) => r.vendor_id));
  }, [engaged, requirementId]);

  const send = useCallback(
    async (vendorId: string) => {
      setError(null);
      try {
        await invite.mutateAsync({
          vendorId,
          requirementId: requirementId || null,
          details: details.trim() || null,
        });
        // Kept locally so the row updates the instant it succeeds, without
        // waiting for the board's refetch to come back and re-derive it.
        setInvitedIds((prev) => [...prev, vendorId]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not send that invitation.');
      }
    },
    [details, invite, requirementId],
  );

  const reset = useCallback(() => {
    setQuery('');
    setRequirementId('');
    setDetails('');
    setError(null);
    setInvitedIds([]);
  }, []);

  return {
    query,
    setQuery,
    requirementId,
    setRequirementId,
    details,
    setDetails,
    vendors: lookup.data?.vendors ?? [],
    requirement,
    mismatchedIds,
    isTruncated: lookup.data?.isTruncated ?? false,
    searching: lookup.isFetching,
    engagedIds,
    invitedIds,
    busyId: invite.isPending ? invite.variables?.vendorId : undefined,
    error,
    send,
    reset,
  };
}
