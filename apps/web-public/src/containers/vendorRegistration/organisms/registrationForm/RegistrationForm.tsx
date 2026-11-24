import type { ReferenceOption } from '@/lib/queries';
import RegistrationFormClient from './RegistrationFormClient';

type Props = { categories: ReferenceOption[]; categoriesFailed: boolean };

/**
 * Server Component shell. Service categories are fetched on the server and
 * passed down, so only the interactive form island ships to the browser.
 */
export default function RegistrationForm({ categories, categoriesFailed }: Props) {
  return <RegistrationFormClient categories={categories} categoriesFailed={categoriesFailed} />;
}
