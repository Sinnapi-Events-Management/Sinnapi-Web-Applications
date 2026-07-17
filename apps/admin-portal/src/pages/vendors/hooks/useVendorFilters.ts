import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { VendorAdminFilters } from '@/hooks/queries';
import { VENDOR_VISIBILITIES } from '@/lib/status';
import { isValidRating } from '../schema/filters';

const VISIBILITY_PARAM = 'visibility';
const RATING_PARAM = 'rating';
const FEATURED_PARAM = 'featured';

/** Raw field values for the toolbar controls (all strings/booleans). */
export type VendorFilterValues = {
  /** `vendor_visibility` value, or `''` for any. */
  visibility: string;
  /** Minimum rating as a string (Select value), or `''` for any. */
  minRating: string;
  featured: boolean;
};

export type VendorFilters = {
  values: VendorFilterValues;
  setVisibility: (next: string) => void;
  setMinRating: (next: string) => void;
  setFeatured: (next: boolean) => void;
  /** Typed fragment to merge into the query's `VendorAdminFilters`. */
  query: Pick<VendorAdminFilters, 'visibility' | 'minRating' | 'featured'>;
  /** True when any of visibility / rating / featured is narrowing the list. */
  isActive: boolean;
  reset: () => void;
};

/**
 * Owns the Vendors list' attribute filters — visibility, minimum rating and
 * featured-only — mirrored into the URL so a filtered view is refresh-safe and
 * shareable, and restored when returning from a vendor detail page. Invalid or
 * hand-edited params degrade to "any" rather than querying an impossible value.
 *
 * `onChange` fires after every change — pass a page reset so filtering starts
 * on page 1 instead of a page that may no longer exist.
 */
export function useVendorFilters(opts?: { onChange?: () => void }): VendorFilters {
  const { onChange } = opts ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  const rawVisibility = searchParams.get(VISIBILITY_PARAM) ?? '';
  const visibility = (VENDOR_VISIBILITIES as readonly string[]).includes(rawVisibility)
    ? rawVisibility
    : '';
  const rawRating = searchParams.get(RATING_PARAM) ?? '';
  const minRating = isValidRating(rawRating) ? rawRating : '';
  const featured = searchParams.get(FEATURED_PARAM) === 'true';

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (prev) => {
          // Rebuild from `prev` so unrelated params (search, status) survive.
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
      onChange?.();
    },
    [setSearchParams, onChange],
  );

  const setVisibility = useCallback((next: string) => setParam(VISIBILITY_PARAM, next), [setParam]);
  const setMinRating = useCallback((next: string) => setParam(RATING_PARAM, next), [setParam]);
  const setFeatured = useCallback(
    (next: boolean) => setParam(FEATURED_PARAM, next ? 'true' : ''),
    [setParam],
  );

  const reset = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(VISIBILITY_PARAM);
        next.delete(RATING_PARAM);
        next.delete(FEATURED_PARAM);
        return next;
      },
      { replace: true },
    );
    onChange?.();
  }, [setSearchParams, onChange]);

  const query = useMemo(
    () => ({
      visibility: visibility || undefined,
      minRating: minRating ? Number(minRating) : undefined,
      featured: featured || undefined,
    }),
    [visibility, minRating, featured],
  );

  return {
    values: { visibility, minRating, featured },
    setVisibility,
    setMinRating,
    setFeatured,
    query,
    isActive: Boolean(visibility || minRating || featured),
    reset,
  };
}
