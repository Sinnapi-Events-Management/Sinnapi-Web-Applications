import type { BookingActivityModel } from '@/lib/types';
import BookingActivityCard from './BookingActivityCard';

type Props = {
  entries: BookingActivityModel[];
  isLoading: boolean;
  error: unknown;
};

/**
 * Everything that has happened to this booking. One card, full width — the
 * trail is a list of dated rows with an actor and a sentence on each, and
 * splitting it into a column would only make every row wrap sooner.
 *
 * The card reports its own loading and failure in place rather than raising
 * them to the page: the trail is secondary to the booking, and a read that
 * failed here should not blank a screen an operator opened to change a status.
 */
export default function ActivitySection({ entries, isLoading, error }: Props) {
  return <BookingActivityCard entries={entries} isLoading={isLoading} error={error} />;
}
