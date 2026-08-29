import { useMemo } from 'react';
import { usePlans } from '@/hooks/queries';
import { useVendorContext } from '@/vendor/VendorProvider';
import { readPortfolioLimits, remainingImages, type PortfolioLimits } from '../schema';

export type PortfolioPlan = PortfolioLimits & {
  imageCount: number;
  /** Images still addable, or null when the plan sets no cap. */
  remaining: number | null;
  /** True once the cap is reached — the add button says so rather than failing. */
  imagesExhausted: boolean;
};

/**
 * What this vendor's plan allows, joined to what they have already used.
 *
 * The subscription comes from context (already fetched for the shell's banner)
 * and the plan catalogue from the shared `usePlans` query, so this adds no
 * network work of its own — it is a derivation, and lives in a hook only because
 * two components need the same answer.
 */
export function usePortfolioPlan(imageCount: number): PortfolioPlan {
  const { subscription } = useVendorContext();
  const { data: plans } = usePlans();

  return useMemo(() => {
    const limits = readPortfolioLimits(plans, subscription?.plan_id);
    const remaining = remainingImages(limits, imageCount);
    return {
      ...limits,
      imageCount,
      remaining,
      imagesExhausted: remaining !== null && remaining <= 0,
    };
  }, [plans, subscription?.plan_id, imageCount]);
}
