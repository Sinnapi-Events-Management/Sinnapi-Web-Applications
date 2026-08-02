import { Grid } from '@sinnapi/ui/atoms';
import VendorCard from '@/components/molecules/vendorCard';
import ScrollReveal from '@/components/atoms/scrollReveal';
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
      {vendors.map((vendor, i) => (
        <Grid item xs={12} sm={6} md={4} key={vendor.id}>
          <ScrollReveal delay={i * 60} sx={{ height: '100%' }}>
            <VendorCard vendor={vendor} categories={vendor.categories} />
          </ScrollReveal>
        </Grid>
      ))}
    </Grid>
  );
}
