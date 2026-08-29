import { Grid } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import type { PromotionRow } from '../../schema';
import PromotionCard from '../molecules/PromotionCard';

type Props = {
  promotions: PromotionRow[];
  now: number;
  busyId: string | null;
  codesLoading: boolean;
  /** True when the vendor has campaigns but none match the current tab. */
  isFiltered: boolean;
  onCreate: () => void;
  onEdit: (promotion: PromotionRow) => void;
  onDuplicate: (promotion: PromotionRow) => void;
  onToggleActive: (promotion: PromotionRow) => void;
  onDelete: (promotion: PromotionRow) => void;
};

/**
 * The campaigns.
 *
 * One column on a phone, two from `sm`, three from `lg` — the same breakpoints
 * the packages grid uses, so a vendor moving between the two screens is looking
 * at one layout rather than two similar ones. Three is the ceiling: a campaign
 * card carries a banner, a progress bar and a redemption line, and a fourth
 * column shrinks all three below the width they are legible at.
 *
 * The two empty states are different sentences on purpose. A vendor with no
 * campaigns at all needs to know what one is for, and gets the action — this is
 * the emptiest screen in the portal and the one most likely to be a vendor's
 * first visit. A vendor whose tab hides them all needs to know that is what
 * happened, and must not be offered "create your first" when they have twelve.
 */
export default function PromotionGrid({
  promotions,
  now,
  busyId,
  codesLoading,
  isFiltered,
  onCreate,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: Props) {
  if (promotions.length === 0) {
    return isFiltered ? (
      <EmptyState
        title="Nothing under this filter"
        description="Your other campaigns are still here — switch back to All to see them."
      />
    ) : (
      <EmptyState
        title="No campaigns yet"
        description="A campaign is a dated offer clients see on your profile — a festive discount, a last-minute deal, an early-booking window. Attach a discount code to one and you can see exactly what it returned."
        ctaLabel="Create your first campaign"
        onCta={onCreate}
      />
    );
  }

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      {promotions.map((promotion) => (
        <Grid item xs={12} sm={6} lg={4} key={promotion.id}>
          <PromotionCard
            promotion={promotion}
            now={now}
            busy={busyId === promotion.id}
            codesLoading={codesLoading}
            onEdit={() => onEdit(promotion)}
            onDuplicate={() => onDuplicate(promotion)}
            onToggleActive={() => onToggleActive(promotion)}
            onDelete={() => onDelete(promotion)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
