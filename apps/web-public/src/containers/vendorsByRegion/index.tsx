import { Container, Grid } from '@sinnapi/ui';
import { PageHeader } from '@/components/molecules/sectionHeading';
import VendorCard from '@/components/molecules/vendorCard';
import VendorFilterBar from '@/components/organisms/vendorFilterBar';
import EmptyState from '@/components/molecules/emptyState';
import { titleize } from '@/lib/config/site';
import { getVendorsByRegionData } from './hooks/getVendorsByRegionData';

export default async function VendorsByRegionContainer({ params }: { params: { region: string } }) {
  const vendors = await getVendorsByRegionData(params.region);
  const name = titleize(params.region);
  return (
    <>
      <PageHeader
        title={`Vendors in ${name}`}
        subtitle={`Trusted event providers serving ${name}.`}
      />
      <Container sx={{ py: 4 }}>
        <VendorFilterBar defaults={{ region: params.region }} />
        {vendors.length === 0 ? (
          <EmptyState
            title={`No vendors in ${name} yet`}
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
