import { InfoCard, Stack, Chip, Typography, Button, Skeleton } from '@sinnapi/ui';
import EditIcon from '@mui/icons-material/Edit';
import CoverageDialog from './CoverageDialog';
import { useVendorCoverageEdit } from '../hooks/useVendorCoverageEdit';

/**
 * The regions this vendor serves, and the control to change them.
 *
 * Worth its own card rather than a `Field` in Business details: coverage is the
 * one attribute here that decides whether a vendor is reachable at all through
 * the location filters on Discover and the public site, and the empty state is
 * something staff should be able to spot and fix — not a dash among a dozen
 * other dashes.
 */
export default function CoverageCard({ vendorId }: { vendorId: string }) {
  const coverage = useVendorCoverageEdit(vendorId);

  return (
    <InfoCard
      title="Service coverage"
      headerAction={
        <Button size="small" startIcon={<EditIcon />} onClick={coverage.openDialog}>
          Edit
        </Button>
      }
    >
      {coverage.isLoading ? (
        <Skeleton width={220} />
      ) : coverage.labels.length > 0 ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {coverage.labels.map((label) => (
            <Chip key={label} size="small" label={label} />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="warning.main">
          No regions set — this vendor is excluded from every location filter.
        </Typography>
      )}

      <CoverageDialog
        open={coverage.open}
        regions={coverage.regions}
        selected={coverage.draft}
        onToggle={coverage.toggle}
        onCancel={coverage.closeDialog}
        onConfirm={coverage.confirm}
        busy={coverage.busy}
        error={coverage.saveError}
      />
    </InfoCard>
  );
}
