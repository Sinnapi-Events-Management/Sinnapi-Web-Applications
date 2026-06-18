import type { Metadata } from "next";
import { Container, Grid } from "@mui/material";
import { PageHeader } from "@/components/common/SectionHeading";
import VendorCard from "@/components/vendor/VendorCard";
import VendorFilterBar from "@/components/vendor/VendorFilterBar";
import EmptyState from "@/components/common/EmptyState";
import { getVendors } from "@/lib/queries";
import { SERVICE_REGIONS, titleize } from "@/lib/config/site";

export const revalidate = 900;
export const dynamicParams = true;

export function generateStaticParams() {
  return SERVICE_REGIONS.map((region) => ({ region }));
}

export function generateMetadata({ params }: { params: { region: string } }): Metadata {
  const name = titleize(params.region);
  return {
    title: `Event vendors in ${name}`,
    description: `Find verified event vendors serving ${name} on Sinnapi.`,
    alternates: { canonical: `/vendors/region/${params.region}` },
  };
}

export default async function RegionPage({ params }: { params: { region: string } }) {
  const vendors = await getVendors({ region: params.region });
  const name = titleize(params.region);
  return (
    <>
      <PageHeader title={`Vendors in ${name}`} subtitle={`Trusted event providers serving ${name}.`} />
      <Container sx={{ py: 4 }}>
        <VendorFilterBar defaults={{ region: params.region }} />
        {vendors.length === 0 ? (
          <EmptyState title={`No vendors in ${name} yet`} ctaLabel="Browse all vendors" ctaHref="/vendors" />
        ) : (
          <Grid container spacing={3}>
            {vendors.map((v) => <Grid item xs={12} sm={6} md={4} lg={3} key={v.id}><VendorCard vendor={v} /></Grid>)}
          </Grid>
        )}
      </Container>
    </>
  );
}
