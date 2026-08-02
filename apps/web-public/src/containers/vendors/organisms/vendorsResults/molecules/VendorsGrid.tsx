import { Grid } from '@sinnapi/ui/atoms';
import VendorCard from '@/components/molecules/vendorCard';
import ScrollReveal from '@/components/atoms/scrollReveal';
import type { VendorListingModel } from '@/lib/types';
import VendorCardSkeleton from '../atoms/VendorCardSkeleton';

/** Breakpoint spans, shared by the real grid and its skeleton so they align. */
const SPAN = { xs: 12, sm: 6, md: 4, lg: 3 } as const;

/**
 * The vendor grid itself. `categories` come from the same RPC projection the
 * home rail uses, so the chip row on each card is populated here too.
 */
export function VendorsGrid({ vendors }: { vendors: VendorListingModel[] }) {
  return (
    <Grid container spacing={3}>
      {vendors.map((vendor, i) => (
        <Grid item {...SPAN} key={vendor.id}>
          <ScrollReveal delay={(i % 12) * 60} sx={{ height: '100%' }}>
            <VendorCard vendor={vendor} categories={vendor.categories} />
          </ScrollReveal>
        </Grid>
      ))}
    </Grid>
  );
}

/**
 * First-load placeholder. Renders a full page of cards so the layout settles at
 * its real height immediately rather than growing under the visitor as results
 * stream in — filter changes never reach this path, since `keepPreviousData`
 * keeps the previous results on screen instead.
 */
export function VendorsGridSkeleton({ count }: { count: number }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }, (_, index) => (
        <Grid item {...SPAN} key={index}>
          <VendorCardSkeleton />
        </Grid>
      ))}
    </Grid>
  );
}
