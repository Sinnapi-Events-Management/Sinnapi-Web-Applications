import { Grid } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import type { DiscountRow } from '../../schema';
import DiscountCard from '../molecules/DiscountCard';

type Props = {
  discounts: DiscountRow[];
  now: number;
  busyId: string | null;
  /** The code string most recently copied, so one card can show its tick. */
  copiedCode: string | null;
  /** True when the vendor has codes but none survive the tab and the term. */
  isFiltered: boolean;
  onCopy: (code: string) => void;
  onCreate: () => void;
  onEdit: (discount: DiscountRow) => void;
  onDuplicate: (discount: DiscountRow) => void;
  onToggleActive: (discount: DiscountRow) => void;
  onDelete: (discount: DiscountRow) => void;
};

/**
 * The codes.
 *
 * One column on a phone, two from `sm`, three from `lg` — the same breakpoints
 * the campaigns and packages grids use, so a vendor moving between the three
 * screens is looking at one layout rather than three similar ones. Three is the
 * ceiling: a code card carries a monospace band, a headline figure, condition
 * chips and a progress bar, and a fourth column shrinks all four below the
 * width they are legible at.
 *
 * The two empty states are different sentences on purpose. A vendor with no
 * codes at all needs to know what one is for, and gets the action. A vendor
 * whose tab or search hides them all needs to know that is what happened, and
 * must not be offered "create your first" when they have twelve.
 */
export default function DiscountGrid({
  discounts,
  now,
  busyId,
  copiedCode,
  isFiltered,
  onCopy,
  onCreate,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: Props) {
  if (discounts.length === 0) {
    return isFiltered ? (
      <EmptyState
        title="No codes match"
        description="Your other discount codes are still here — clear the search, or switch back to All."
      />
    ) : (
      <EmptyState
        title="No discount codes yet"
        description="A discount code is what a client types to get a reduction — an early-booking rate, a festive offer, a thank-you for a repeat client. Cap how many times it can be used, set the booking size it applies from, and attach it to a campaign to see exactly what that campaign returned."
        ctaLabel="Create your first code"
        onCta={onCreate}
      />
    );
  }

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      {discounts.map((discount) => (
        <Grid item xs={12} sm={6} lg={4} key={discount.id}>
          <DiscountCard
            discount={discount}
            now={now}
            busy={busyId === discount.id}
            copied={copiedCode !== null && copiedCode === discount.code}
            onCopy={onCopy}
            onEdit={() => onEdit(discount)}
            onDuplicate={() => onDuplicate(discount)}
            onToggleActive={() => onToggleActive(discount)}
            onDelete={() => onDelete(discount)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
