import { Container, Grid } from '@sinnapi/ui/atoms';
import { PageHeader } from '@/components/molecules/sectionHeading';
import VendorCard from '@/components/molecules/vendorCard';
import VendorFilterBar from '@/components/organisms/vendorFilterBar';
import EmptyState from '@/components/molecules/emptyState';
import { titleize } from '@/lib/config/site';
import { getVendorsByCategoryData } from './hooks/getVendorsByCategoryData';

export default async function VendorsByCategoryContainer({
  params,
}: {
  params: { category: string };
}) {
  const vendors = await getVendorsByCategoryData(params.category);
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
