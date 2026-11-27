import type { Metadata } from 'next';
import { getServiceCategories, type ReferenceOption } from '@/lib/queries';
import VendorRegistrationContainer from '@/containers/vendorRegistration';

// Rendered per request so the services list always mirrors `service_categories`.
// Without this the route is fully static and the categories are frozen into the
// HTML at build time — an admin's new, renamed or disabled category would not
// reach applicants until the next deploy.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vendor application',
  description:
    'Apply to become a verified Sinnapi vendor in about two minutes. Tell us your business name, contact details and the services you offer — no account or documents needed to start.',
  alternates: { canonical: '/apply/register' },
};

export default async function VendorRegisterPage() {
  // A failed lookup must not take the whole page down: the applicant can still
  // fill in everything else while the services field offers a retry.
  let categories: ReferenceOption[] = [];
  let categoriesFailed = false;
  try {
    categories = await getServiceCategories();
  } catch (error) {
    console.error('Vendor application: loading service categories failed', error);
    categoriesFailed = true;
  }

  return (
    <VendorRegistrationContainer categories={categories} categoriesFailed={categoriesFailed} />
  );
}
