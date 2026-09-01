import { Alert, Box, Button, Divider, QueryState, SectionCard, Stack } from '@sinnapi/ui';
import MapIcon from '@mui/icons-material/MapOutlined';
import { useServiceCoverage } from '../../hooks/useServiceCoverage';
import CoverageGapNotice from '../atoms/CoverageGapNotice';
import RegionCheckboxGrid from '../molecules/RegionCheckboxGrid';

type Props = {
  vendorId: string;
  /** Bubbles the success toast up to the page, as every other card here does. */
  onDone: (message: string) => void;
};

/**
 * Where a vendor declares the regions they serve.
 *
 * This is the only place that coverage can be kept current. An application records
 * it once at signup and `approve_vendor` copies it across, but nothing afterwards —
 * a vendor who expands beyond their home region had no way to say so, and one who
 * never stated a region at all was silently unreachable through every location
 * filter on the platform.
 *
 * Saved on its own button rather than with the details form above, because it
 * writes to a different table through an RPC: one Save committing both would be two
 * unrelated statements with no transaction across them.
 */
export default function ServiceCoverageCard({ vendorId, onDone }: Props) {
  const {
    regions,
    selected,
    toggle,
    isDirty,
    isUncovered,
    submit,
    isLoading,
    error,
    busy,
    saveError,
  } = useServiceCoverage(vendorId, onDone);

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
            {saveError && <Alert severity="error">{saveError}</Alert>}
            {isUncovered && <CoverageGapNotice />}

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
