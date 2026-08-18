import { Alert, Box, Button, Divider, QueryState, SectionCard, Stack } from '@sinnapi/ui';
import MapIcon from '@mui/icons-material/MapOutlined';
import RegionCheckboxGrid from '../molecules/RegionCheckboxGrid';
import { useServiceCoverage } from '../../hooks/useServiceCoverage';

/**
 * Where a vendor declares the regions they serve.
 *
 * This is the only place that coverage can be kept current. An application records
 * it once at signup and `approve_vendor` copies it across, but nothing afterwards —
 * a vendor who expands beyond their home region had no way to say so, and one who
 * never stated a region at all was silently unreachable through every location
 * filter on the platform.
 *
 * Hence the empty-state warning: "no regions selected" isn't a neutral default,
 * it's the state that makes a vendor invisible to clients browsing by location, and
 * it should say so rather than look like an untouched form.
 */
type Props = {
  vendorId: string;
  /** Bubbles the success toast up to the page, as every other card here does. */
  onDone: (message: string) => void;
};

export default function ServiceCoverageCard({ vendorId, onDone }: Props) {
  const { regions, selected, toggle, isDirty, submit, isLoading, error, busy, saveError } =
    useServiceCoverage(vendorId, onDone);

  return (
    <SectionCard
      title="Service coverage"
      subtitle="The regions clients can find you in"
      icon={<MapIcon />}
      accent="primary"
    >
      <Box component="form" onSubmit={submit} noValidate>
        <QueryState isLoading={isLoading} error={error}>
          <Stack spacing={2}>
            {saveError && (
              <Alert severity="error">
                {saveError instanceof Error ? saveError.message : 'Could not save your coverage.'}
              </Alert>
            )}

            {selected.length === 0 && (
              <Alert severity="warning">
                You haven&apos;t selected any regions, so you won&apos;t appear when clients filter
                vendors by location. Pick at least one.
              </Alert>
            )}

            <RegionCheckboxGrid
              regions={regions}
              selected={selected}
              onToggle={toggle}
              disabled={busy}
            />

            <Divider />

            <Stack direction="row" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={busy || !isDirty}
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                {busy ? 'Saving…' : 'Save coverage'}
              </Button>
            </Stack>
          </Stack>
        </QueryState>
      </Box>
    </SectionCard>
  );
}
