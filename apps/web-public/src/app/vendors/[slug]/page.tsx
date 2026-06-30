import type { Metadata } from 'next';
import {
  getVendorBySlugData,
  getAllVendorSlugsData,
} from '@/containers/vendorDetail/utils/getVendorDetailData';

export const revalidate = 600; // ISR + on-demand revalidation on profile changes

export async function generateStaticParams() {
  const slugs = await getAllVendorSlugsData();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const vendor = await getVendorBySlugData(params.slug);
  if (!vendor) return { title: 'Vendor not found' };
  const desc =
    vendor.biography?.slice(0, 155) ??
    `${vendor.business_name} — verified event vendor on Sinnapi.`;
  return {
    title: vendor.business_name,
    description: desc,
    alternates: { canonical: `/vendors/${vendor.slug}` },
    openGraph: {
      title: vendor.business_name,
      description: desc,
      images: vendor.primary_image_url ? [vendor.primary_image_url] : [],
    },
  };
}

export { default } from '@/containers/vendorDetail';
