import { Container, Grid } from '@sinnapi/ui';
import VendorCard from '@/components/molecules/vendorCard';
import SectionHeading from '@/components/molecules/sectionHeading';
import EmptyState from '@/components/molecules/emptyState';
import type { VendorCardModel } from '@/lib/types';

export default function FeaturedVendors({ vendors }: { vendors: VendorCardModel[] }) {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        overline="Handpicked"
        title="Featured vendors"
        subtitle="Top-rated, verified providers ready for your next event."
      />
      {vendors.length === 0 ? (
        <EmptyState
          title="Featured vendors coming soon"
          description="Verified vendors will appear here once onboarded."
          ctaLabel="Browse all vendors"
          ctaHref="/vendors"
        />
      ) : (
        <Grid container spacing={3}>
          {vendors.map((v) => (
            <Grid item xs={12} sm={6} md={4} key={v.id}>
              <VendorCard vendor={v} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
