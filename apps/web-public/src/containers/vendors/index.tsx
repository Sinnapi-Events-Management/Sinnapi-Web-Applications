import { Container, Grid } from '@sinnapi/ui';
import { PageHeader } from '@/components/molecules/sectionHeading';
import VendorCard from '@/components/molecules/vendorCard';
import VendorFilterBar from '@/components/organisms/vendorFilterBar';
import EmptyState from '@/components/molecules/emptyState';
import { getVendorsData } from './hooks/getVendorsData';

type SearchParams = { q?: string; category?: string; region?: string };

export default async function VendorsContainer({ searchParams }: { searchParams: SearchParams }) {
  const vendors = await getVendorsData(searchParams);
  return (
    <>
      <PageHeader
        title="Find your perfect vendor"
        subtitle="Verified, vetted providers across Uganda and beyond. Sign in to chat, request quotes, and book."
      />
      <Container sx={{ py: 4 }}>
        <VendorFilterBar defaults={searchParams} />
        {vendors.length === 0 ? (
          <EmptyState
            title="No vendors match your search"
            description="Try broadening your filters or browse all categories."
            ctaLabel="Clear filters"
            ctaHref="/vendors"
          />
        ) : (
          <Grid container spacing={3}>
            {vendors.map((v) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={v.id}>
                <VendorCard vendor={v} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </>
  );
}
