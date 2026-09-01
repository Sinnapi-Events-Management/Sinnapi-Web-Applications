import { Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import type { ReviewRow } from '../../schema';
import ReviewCard from '../molecules/ReviewCard';

type Props = {
  rows: ReviewRow[];
  /** True when the vendor has reviews but none survive the current narrowing. */
  isFilteredEmpty: boolean;
  onClearFilters: () => void;
};

/**
 * The reviews themselves, as a single column.
 *
 * One column at every width on purpose. A review is a paragraph of prose with a
 * reply editor under it, and prose set in a two-up grid either wraps every few
 * words or forces the cards to a shared height that leaves a short review
 * floating in white space. The list is also a queue worked top to bottom, which
 * a grid makes people scan in two directions instead of one.
 *
 * Filtering to nothing is answered here rather than by an empty column. A
 * vendor who has narrowed to 2★ reviews still awaiting a reply and found none
 * has usually had good news, not a broken page — but they still need one click
 * back to the full list rather than three controls to remember and undo.
 */
export default function ReviewsList({ rows, isFilteredEmpty, onClearFilters }: Props) {
  if (isFilteredEmpty)
    return (
      <EmptyState
        title="No reviews match these filters"
        description="Nothing here answers the score, the reply state and the wording you have set together. Widen any one of them to see more."
        ctaLabel="Clear filters"
        onCta={onClearFilters}
      />
    );

  return (
    <Stack spacing={2}>
      {rows.map((row) => (
        <ReviewCard key={row.id} row={row} />
      ))}
    </Stack>
  );
}
