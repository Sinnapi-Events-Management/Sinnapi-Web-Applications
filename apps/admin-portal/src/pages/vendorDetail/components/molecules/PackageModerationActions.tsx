import { Button, CircularProgress, Stack, Typography, isPackagePublished } from '@sinnapi/ui';
import type { PackageModel } from '@/lib/types';

type Props = {
  pkg: PackageModel;
  busy: boolean;
  onUnpublish: () => void;
  onRestore: () => void;
};

/**
 * The one action the console has over a package, and its undo.
 *
 * A draft gets neither: there is nothing to take down, and offering a disabled
 * button would suggest the console could publish on a vendor's behalf, which it
 * deliberately cannot.
 */
export default function PackageModerationActions({ pkg, busy, onUnpublish, onRestore }: Props) {
  if (busy) return <CircularProgress size={20} />;

  if (pkg.admin_unpublished_at) {
    return (
      <Stack spacing={1}>
        <Typography variant="caption" color="error.main">
          Taken down — {pkg.admin_unpublished_reason}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={onRestore}
          sx={{ alignSelf: 'flex-start' }}
        >
          Restore to the vendor
        </Button>
      </Stack>
    );
  }

  if (!isPackagePublished(pkg)) {
    return (
      <Typography variant="caption" color="text.secondary">
        Not visible to clients. Nothing to moderate.
      </Typography>
    );
  }

  return (
    <Button size="small" color="error" variant="outlined" onClick={onUnpublish}>
      Take off the market
    </Button>
  );
}
