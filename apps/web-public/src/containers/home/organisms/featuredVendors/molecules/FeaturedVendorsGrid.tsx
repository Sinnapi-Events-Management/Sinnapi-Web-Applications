import { Grid } from '@sinnapi/ui/atoms';
import VendorCard from '@/components/molecules/vendorCard';
import type { FeaturedVendorModel } from '@/lib/types';

/**
 * Static layout for a handful of featured vendors. A carousel with one page and
 * a dead arrow reads as broken, so below the rail threshold the cards simply sit
 * in a grid — and the section stays a Server Component with no carousel JS
 * shipped at all, which is the common case for a young marketplace.
 */
export default function FeaturedVendorsGrid({ vendors }: { vendors: FeaturedVendorModel[] }) {
  return (
    <Grid container spacing={3}>
      {vendors.map((vendor) => (
        <Grid item xs={12} sm={6} md={4} key={vendor.id}>
          <VendorCard vendor={vendor} categories={vendor.categories} />
        </Grid>
      ))}
    </Grid>
  );
}
