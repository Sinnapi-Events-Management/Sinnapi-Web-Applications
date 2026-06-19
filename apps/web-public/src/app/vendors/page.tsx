import type { Metadata } from 'next';
import { Container, Grid } from '@sinnapi/ui';
import { PageHeader } from '@/components/common/SectionHeading';
import VendorCard from '@/components/vendor/VendorCard';
import VendorFilterBar from '@/components/vendor/VendorFilterBar';
import EmptyState from '@/components/common/EmptyState';
import { getVendors } from '@/lib/queries';

export const revalidate = 900; // ISR

export const metadata: Metadata = {
  title: 'Find verified event vendors',
  description:
    'Browse and compare trusted, verified event service providers — photographers, caterers, venues, decorators and more.',
  alternates: { canonical: '/vendors' },
};

type SearchParams = { q?: string; category?: string; region?: string };

export default async function VendorsPage({ searchParams }: { searchParams: SearchParams }) {
  const vendors = await getVendors({
    q: searchParams.q,
    category: searchParams.category,
    region: searchParams.region,
  });
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
