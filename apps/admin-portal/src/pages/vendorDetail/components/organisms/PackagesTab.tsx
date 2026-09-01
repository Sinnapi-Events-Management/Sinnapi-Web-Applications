import { Alert, Box, Grid, PackageShowcase, QueryState, isPackagePublished } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useVendorPackageModeration } from '../../hooks/useVendorPackageModeration';
import PackageStateChip from '../atoms/PackageStateChip';
import PackageModerationActions from '../molecules/PackageModerationActions';
import PackageModerationDialog from './PackageModerationDialog';

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
 *
 * The offers are threaded in so the cards carry the price a client is actually
 * being quoted — see `useVendorPackageModeration`, which owns that read and the
 * indexing behind it. Layout only here.
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
              // Full width up to `lg`: a package carries an itemised table, two
              // scope lists and a tier row, and half a tablet is not enough for
              // any of them.
              <Grid item xs={12} lg={6} key={pkg.id}>
                <Box sx={{ opacity: isPackagePublished(pkg) ? 1 : 0.72 }}>
                  <PackageShowcase
                    pkg={pkg}
                    offers={state.offersFor(pkg)}
                    headerAction={<PackageStateChip pkg={pkg} />}
                    renderAction={() => (
                      <PackageModerationActions
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
