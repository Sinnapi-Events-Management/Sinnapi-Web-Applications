import { Chip, Tooltip, isPackagePublished } from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';

/**
 * Where a package stands with the console, in the showcase's header slot.
 *
 * Four states rather than two, because "not on the market" has four different
 * causes and only one of them is the console's doing: the vendor never
 * finished it (draft), the vendor retired it (archived), the console pulled it
 * (taken down), or it is live. An operator reading a single "Not live" chip
 * would have to open the row to find out which.
 *
 * The take-down reason rides in a tooltip rather than the label: it is a
 * sentence an operator wrote for the vendor, and a chip that grows to fit one
 * breaks the card header it sits in.
 */
export default function PackageStateChip({ pkg }: { pkg: PackageModel }) {
  if (pkg.admin_unpublished_at) {
    return (
      <Tooltip title={pkg.admin_unpublished_reason ?? ''}>
        <Chip size="small" color="error" label="Taken down" />
      </Tooltip>
    );
  }
  if (pkg.is_active === false) return <Chip size="small" label="Archived" />;
  if (isPackagePublished(pkg)) return <Chip size="small" color="success" label="Live" />;
  return <Chip size="small" variant="outlined" label="Draft" />;
}
