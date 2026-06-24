import type { Metadata } from 'next';
import { Container, Grid } from '@sinnapi/ui';
import { PageHeader } from '@/components/common/SectionHeading';
import VendorCard from '@/components/vendor/vendorCard';
import VendorFilterBar from '@/components/vendor/vendorFilterBar';
import EmptyState from '@/components/common/EmptyState';
import { getVendors } from '@/lib/queries';
import { VENDOR_CATEGORIES, titleize } from '@/lib/config/site';

export const revalidate = 900;
export const dynamicParams = true;

export function generateStaticParams() {
  return VENDOR_CATEGORIES.map((category) => ({ category }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const name = titleize(params.category);
  return {
    title: `${name} vendors`,
    description: `Browse verified ${name.toLowerCase()} vendors on Sinnapi.`,
    alternates: { canonical: `/vendors/category/${params.category}` },
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const vendors = await getVendors({ category: params.category });
  const name = titleize(params.category);
  return (
    <>
      <PageHeader
        title={`${name} vendors`}
        subtitle={`Verified ${name.toLowerCase()} providers for your event.`}
      />
      <Container sx={{ py: 4 }}>
        <VendorFilterBar defaults={{ category: params.category }} />
        {vendors.length === 0 ? (
          <EmptyState
            title={`No ${name.toLowerCase()} vendors yet`}
            ctaLabel="Browse all vendors"
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
