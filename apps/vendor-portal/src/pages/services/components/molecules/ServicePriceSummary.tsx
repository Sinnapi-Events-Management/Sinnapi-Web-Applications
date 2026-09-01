import { Box, Skeleton, Stack, Typography, formatAmount } from '@sinnapi/ui';
import type { ServicePricing } from '../../hooks/useServicePricing';

/**
 * What this service costs — derived, never typed.
 *
 * The figure comes from the cheapest tier across the service's PUBLISHED
 * packages, through `packageFromPrice`: the same function that renders the
 * number on the client's card and on the marketing site. That is the point of
 * the whole change. The vendor used to type a `base_price` here that no client
 * ever saw and that could contradict their real packages; now the vendor and
 * the client are reading one number, produced once.
 *
 * The three states are three different pieces of advice, so they are written
 * as three sentences rather than one with holes in it:
 *
 *   no packages at all   → the service is unsellable; make a package.
 *   packages, none live  → the work is done; publish one.
 *   live packages        → here is what the market sees.
 */
export default function ServicePriceSummary({
  pricing,
  loading,
}: {
  pricing: ServicePricing;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={90} height={16} />
        <Skeleton variant="text" width={140} height={28} />
      </Box>
    );
  }

  if (pricing.packageCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No packages yet — add one to put a price on this service.
      </Typography>
    );
  }

  if (!pricing.from) {
    const n = pricing.packageCount;
    return (
      <Typography variant="body2" color="warning.main">
        {n} {n === 1 ? 'package' : 'packages'}, none published — clients cannot see a price yet.
      </Typography>
    );
  }

  return (
    <Stack direction="row" alignItems="baseline" spacing={1} useFlexGap flexWrap="wrap">
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          From
        </Typography>
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
          {formatAmount(pricing.from.amount, pricing.from.currency)}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        across {pricing.publishedCount} live {pricing.publishedCount === 1 ? 'package' : 'packages'}
      </Typography>
    </Stack>
  );
}
