import type { ReferenceOption } from '@/lib/queries';
import RegistrationFormClient from './RegistrationFormClient';

type Props = { categories: ReferenceOption[]; regions: ReferenceOption[] };

/**
 * Server Component shell. Reference data (categories/regions) is fetched on the
 * server and passed down, so only the interactive form island ships to the
 * browser.
 */
export default function RegistrationForm({ categories, regions }: Props) {
  return <RegistrationFormClient categories={categories} regions={regions} />;
}
