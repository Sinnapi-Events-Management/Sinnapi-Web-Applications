import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  PackageShowcase,
  QueryState,
  Stack,
  Tooltip,
  Typography,
  isPackagePublished,
} from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useVendorPackageModeration } from '../hooks/useVendorPackageModeration';
import PackageModerationDialog from './PackageModerationDialog';
import type { PackageModel } from '@/lib/types';

/**
 * A vendor's packages as the console sees them.
 *
 * Rendered through the same `PackageShowcase` a client sees, rather than as a
 * table of columns. An operator deciding whether a package is misleading has to
 * read it the way the person complaining about it read it — a row of ids and a
 * total tells them nothing about whether the exclusions contradict the summary.
 *
 * Drafts are shown alongside published ones, dimmed and labelled. They are not
 * actionable, but a vendor who publishes and unpublishes the same package
 * around a complaint is a pattern only the full list shows.
 */
export default function PackagesTab({ vendorId }: { vendorId: string }) {
  const state = useVendorPackageModeration(vendorId);

  return (
    <>
      {state.actionError && (
        <Alert severity="error" onClose={state.dismissError} sx={{ mb: 2 }}>
          {state.actionError}
        </Alert>
      )}

      <QueryState isLoading={state.isLoading} error={state.error}>
        {state.packages.length === 0 ? (
          <EmptyState
            title="No packages"
            description="This vendor has not built any priced packages yet."
          />
        ) : (
          <Grid container spacing={3}>
            {state.packages.map((pkg) => (
              <Grid item xs={12} lg={6} key={pkg.id}>
                <Box sx={{ opacity: isPackagePublished(pkg) ? 1 : 0.72 }}>
                  <PackageShowcase
                    pkg={pkg}
                    headerAction={<ModerationStatus pkg={pkg} />}
                    renderAction={() => (
                      <ModerationActions
                        pkg={pkg}
                        busy={state.busyId === pkg.id}
                        onUnpublish={() => state.requestUnpublish(pkg)}
                        onRestore={() => state.restore(pkg)}
                      />
                    )}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>

      <PackageModerationDialog
        pkg={state.pending}
        reason={state.reason}
        busy={state.busyId != null}
        error={state.actionError}
        onReason={state.setReason}
        onCancel={state.cancel}
        onConfirm={state.confirmUnpublish}
      />
    </>
  );
}

/** Where the package stands, in the showcase's header slot. */
function ModerationStatus({ pkg }: { pkg: PackageModel }) {
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

/**
 * The one action the console has, and its undo.
 *
 * A draft gets neither: there is nothing to take down, and offering a disabled
 * button would suggest the console could publish on a vendor's behalf, which it
 * deliberately cannot.
 */
function ModerationActions({
  pkg,
  busy,
  onUnpublish,
  onRestore,
}: {
  pkg: PackageModel;
  busy: boolean;
  onUnpublish: () => void;
  onRestore: () => void;
}) {
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
