import { Chip, Tooltip } from '@sinnapi/ui';
import { isPackagePublished, packageWithheldReason } from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';

/**
 * Where a package stands with the market, in one chip.
 *
 * Four states rather than a published/unpublished boolean, because the three
 * ways of not being published are not interchangeable: a draft is the vendor's
 * own choice, an archive is a decision to stop selling it, and a moderator's
 * take-down is something they have to act on. Collapsing those into "Not
 * published" would hide the only one that needs a response — so the take-down
 * carries its reason in a tooltip and is coloured as the exception it is.
 */
export default function PackageStatusChip({ pkg }: { pkg: PackageModel }) {
  if (pkg.admin_unpublished_at) {
    return (
      <Tooltip title={packageWithheldReason(pkg) ?? ''}>
        <Chip size="small" color="error" label="Taken down" />
      </Tooltip>
    );
  }
  if (pkg.is_active === false) return <Chip size="small" label="Archived" />;
  if (isPackagePublished(pkg)) return <Chip size="small" color="success" label="Published" />;
  return <Chip size="small" color="warning" variant="outlined" label="Draft" />;
}
