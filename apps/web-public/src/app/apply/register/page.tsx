import type { Metadata } from 'next';
import { getServiceCategories, getServiceRegions } from '@/lib/queries';
import VendorRegistrationContainer from '@/containers/vendorRegistration';

export const metadata: Metadata = {
  title: 'Vendor application',
  description:
    'Apply to become a verified Sinnapi vendor. Tell us about your business, upload your portfolio and verification documents, and get listed — no account required to start.',
  alternates: { canonical: '/apply/register' },
};

export default async function VendorRegisterPage() {
  const [categories, regions] = await Promise.all([getServiceCategories(), getServiceRegions()]);
  return <VendorRegistrationContainer categories={categories} regions={regions} />;
}
