import { Grid } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import type { PackageModel } from '@/lib/types';
import PackageCard from '../molecules/PackageCard';

type Props = {
  packages: PackageModel[];
  busyId: string | null;
  /** True when the vendor has packages but none match the current filter. */
  isFiltered: boolean;
  onEdit: (pkg: PackageModel) => void;
  onDuplicate: (pkg: PackageModel) => void;
  onDelete: (pkg: PackageModel) => void;
  onSetVisibility: (pkg: PackageModel, makePublic: boolean) => void;
};

/**
 * The catalogue.
 *
 * Three across on a desktop, two on a tablet, one on a phone — a package card
 * carries a cover image, a price and two controls, and anything narrower than
 * about 300px turns the price and the publish button into a squeeze.
 *
 * The two empty states are different sentences on purpose: a vendor with no
 * packages at all needs to know what one is for, while a vendor whose filter
 * hides them all needs to know that is what happened.
 */
export default function PackageGrid({
  packages,
  busyId,
  isFiltered,
  onEdit,
  onDuplicate,
  onDelete,
  onSetVisibility,
}: Props) {
  if (packages.length === 0) {
    return isFiltered ? (
      <EmptyState
        title="Nothing under this filter"
        description="Your other packages are still here — switch back to All to see them."
      />
    ) : (
      <EmptyState
        title="No packages yet"
        description="A package is a priced offer you can publish to your profile and quote from in one click — tiers, line items, what's included and what isn't."
      />
    );
  }

  return (
    <Grid container spacing={3}>
      {packages.map((pkg) => (
        <Grid item xs={12} sm={6} lg={4} key={pkg.id}>
          <PackageCard
            pkg={pkg}
            busy={busyId === pkg.id}
            onEdit={() => onEdit(pkg)}
            onDuplicate={() => onDuplicate(pkg)}
            onDelete={() => onDelete(pkg)}
            onSetVisibility={(makePublic) => onSetVisibility(pkg, makePublic)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
