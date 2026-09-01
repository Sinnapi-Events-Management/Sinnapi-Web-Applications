import { Chip, Stack } from '@sinnapi/ui';
import { titleize } from '@/lib/config';
import type { VendorDetailModel } from '@/lib/types';

/**
 * How this vendor works, as chips: pricing model, lead time, years trading.
 *
 * Renders nothing when a vendor has filled in none of the three, so a sparse
 * profile shows a biography rather than an empty rail of nothing.
 */
export default function VendorTerms({ vendor }: { vendor: VendorDetailModel }) {
  const hasAny = vendor.pricing_model || vendor.lead_time || vendor.years_in_operation;
  if (!hasAny) return null;

  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      {vendor.pricing_model && <Chip label={titleize(vendor.pricing_model)} />}
      {vendor.lead_time && (
        <Chip variant="outlined" label={`Lead time: ${titleize(vendor.lead_time)}`} />
      )}
      {vendor.years_in_operation && (
        <Chip variant="outlined" label={titleize(vendor.years_in_operation)} />
      )}
    </Stack>
  );
}
