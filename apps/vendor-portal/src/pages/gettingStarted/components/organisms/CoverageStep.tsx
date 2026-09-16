import { Alert, Box, QueryState, Stack } from '@sinnapi/ui';
import RegionCheckboxGrid from '@/components/coverage/RegionCheckboxGrid';
import { useServiceCoverage } from '@/hooks/useServiceCoverage';
import WizardFooter from '../molecules/WizardFooter';

type Props = {
  vendorId: string;
  isLast: boolean;
  onBack: () => void;
  /** Offered only to a vendor who is editing, not onboarding. */
  onCancel?: () => void;
  onDone: () => void;
};

/**
 * The regions the vendor serves.
 *
 * Reuses the same hook and grid as the profile page's coverage card — coverage
 * is written through `set_vendor_service_regions` as a set, and having the
 * wizard reimplement that would be two places to get a half-applied set wrong.
 */
export default function CoverageStep({ vendorId, isLast, onBack, onCancel, onDone }: Props) {
  const { regions, selected, toggle, submit, isLoading, error, busy, saveError } =
    useServiceCoverage(vendorId, onDone);

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <QueryState isLoading={isLoading} error={error}>
        <Stack spacing={2}>
          {saveError && <Alert severity="error">{saveError}</Alert>}
          {selected.length === 0 && (
            <Alert severity="info" variant="outlined">
              Pick at least one region. Until you do, you will not appear in any location search on
              Sinnapi.
            </Alert>
          )}
          <RegionCheckboxGrid
            regions={regions}
            selected={selected}
            onToggle={toggle}
            disabled={busy}
          />
        </Stack>
      </QueryState>

      <WizardFooter
        showBack
        saving={busy}
        isLast={isLast}
        disabled={selected.length === 0}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
      />
    </Box>
  );
}
