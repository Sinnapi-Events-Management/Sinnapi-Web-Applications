import type { Metadata } from 'next';
import { getServiceCategories } from '@/lib/queries';
import VendorRegistrationContainer from '@/containers/vendorRegistration';

export const metadata: Metadata = {
  title: 'Vendor application',
  description:
    'Apply to become a verified Sinnapi vendor in about two minutes. Tell us your business name, contact details and the services you offer — no account or documents needed to start.',
  alternates: { canonical: '/apply/register' },
};

export default async function VendorRegisterPage() {
  const categories = await getServiceCategories();
  return <VendorRegistrationContainer categories={categories} />;
}
