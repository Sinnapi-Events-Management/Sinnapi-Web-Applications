import { Grid } from '@sinnapi/ui/atoms';
import VendorCard from '@/components/molecules/vendorCard';
import EmptyState from '@/components/molecules/emptyState';
import type { VendorListItem } from '../../utils/filterVendors';

/**
 * The vendors grid. Falls back to a contextual empty state whose CTA adapts to
 * whether filters are active — clearing filters when the user has narrowed, or a
 * neutral "coming soon" message when the marketplace is genuinely empty.
 */
export default function VendorsResults({
  vendors,
  activeFilters,
}: {
  vendors: VendorListItem[];
  activeFilters: number;
}) {
  if (vendors.length === 0) {
    return activeFilters > 0 ? (
      <EmptyState
        title="No vendors match your filters"
        description="Try a different category, region or price band — or clear your filters to see everyone."
        ctaLabel="Clear filters"
        ctaHref="/vendors"
      />
    ) : (
      <EmptyState
        title="No vendors listed yet"
        description="Check back soon as we verify and onboard providers across every category."
      />
    );
  }

  return (
    <Grid container spacing={3}>
      {vendors.map((vendor) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={vendor.id}>
          <VendorCard vendor={vendor} />
        </Grid>
      ))}
    </Grid>
  );
}
