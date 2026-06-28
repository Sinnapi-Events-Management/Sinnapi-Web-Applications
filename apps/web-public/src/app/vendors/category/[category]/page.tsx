import type { Metadata } from 'next';
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

export { default } from '@/containers/vendorsByCategory';
