import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IsoDateRange } from '@sinnapi/ui';
import type { PaymentAdminFilters } from '@/hooks/queries';
import { PAYMENT_PROVIDERS, PAYMENT_PURPOSES } from '@/lib/status';

const PROVIDER_PARAM = 'provider';
const PURPOSE_PARAM = 'purpose';
const FROM_PARAM = 'from';
const TO_PARAM = 'to';

/** Raw field values for the toolbar controls. Empty string = "any". */
export type PaymentFilterValues = {
  provider: string;
  purpose: string;
  /** `yyyy-mm-dd`, the inclusive bounds of the created-at range. */
  from: string;
  to: string;
};

export type PaymentFilters = {
  values: PaymentFilterValues;
  setProvider: (next: string) => void;
  setPurpose: (next: string) => void;
  /** Both ends of the date range in one write — see `setRange`. */
  setRange: (range: IsoDateRange) => void;
  /** The range as the picker wants it. */
  range: IsoDateRange;
  /** Typed fragment to merge into the query's `PaymentAdminFilters`. */
  query: Pick<PaymentAdminFilters, 'provider' | 'purpose' | 'from' | 'to'>;
  /** True when any attribute filter is narrowing the list. */
  isActive: boolean;
  /** How many filters are applied (a range counts once). */
  activeCount: number;
  reset: () => void;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Owns the Payments list' attribute filters — provider, purpose and the
 * created-at range — mirrored into the URL so a filtered view is refresh-safe
 * and shareable. Unknown enum values in a hand-edited URL fall back to "any"
 * rather than querying a value that cannot exist.
 *
 * The date inputs are widened to full-day bounds before they reach the query,
 * so a single day includes every payment created in it. The range picker
 * hands back both ends together and they are written in one update: two
 * writes would re-query on the intermediate state, where the new start is
 * paired with the old end — briefly an inverted range.
 *
 * `onChange` fires after every change — pass a page reset so filtering starts
 * on page 1 instead of a page that may no longer exist.
 */
export function usePaymentFilters(opts?: { onChange?: () => void }): PaymentFilters {
  const { onChange } = opts ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  const rawProvider = searchParams.get(PROVIDER_PARAM) ?? '';
  const rawPurpose = searchParams.get(PURPOSE_PARAM) ?? '';
  const rawFrom = searchParams.get(FROM_PARAM) ?? '';
  const rawTo = searchParams.get(TO_PARAM) ?? '';

  const provider = (PAYMENT_PROVIDERS as readonly string[]).includes(rawProvider)
    ? rawProvider
    : '';
  const purpose = (PAYMENT_PURPOSES as readonly string[]).includes(rawPurpose) ? rawPurpose : '';
  const from = ISO_DAY.test(rawFrom) ? rawFrom : '';
  const to = ISO_DAY.test(rawTo) ? rawTo : '';

  const write = useCallback(
    (entries: Record<string, string>) => {
      setSearchParams(
        (prev) => {
          // Rebuild from `prev` so unrelated params (search, status) survive.
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(entries)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
      onChange?.();
    },
    [setSearchParams, onChange],
  );

  const setProvider = useCallback((next: string) => write({ [PROVIDER_PARAM]: next }), [write]);
  const setPurpose = useCallback((next: string) => write({ [PURPOSE_PARAM]: next }), [write]);
  const setRange = useCallback(
    (next: IsoDateRange) => write({ [FROM_PARAM]: next.from, [TO_PARAM]: next.to }),
    [write],
  );
  const reset = useCallback(
    () => write({ [PROVIDER_PARAM]: '', [PURPOSE_PARAM]: '', [FROM_PARAM]: '', [TO_PARAM]: '' }),
    [write],
  );

  const query = useMemo(
    () => ({
      provider: provider || undefined,
      purpose: purpose || undefined,
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    }),
    [provider, purpose, from, to],
  );

  const range = useMemo<IsoDateRange>(() => ({ from, to }), [from, to]);

  // A range counts once, not twice: it is one control on the toolbar.
  const activeCount = [provider, purpose].filter(Boolean).length + (from || to ? 1 : 0);

  return {
    values: { provider, purpose, from, to },
    setProvider,
    setPurpose,
    setRange,
    range,
    query,
    isActive: activeCount > 0,
    activeCount,
    reset,
  };
}
