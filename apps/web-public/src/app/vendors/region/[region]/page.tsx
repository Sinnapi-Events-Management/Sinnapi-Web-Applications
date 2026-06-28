import type { Metadata } from 'next';
import { SERVICE_REGIONS, titleize } from '@/lib/config/site';

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

export { default } from '@/containers/vendorsByRegion';
