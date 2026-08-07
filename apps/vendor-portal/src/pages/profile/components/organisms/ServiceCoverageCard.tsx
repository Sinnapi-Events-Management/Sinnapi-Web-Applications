import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Alert,
  Snackbar,
  QueryState,
} from '@sinnapi/ui';
import RegionCheckboxGrid from '../molecules/RegionCheckboxGrid';
import { useServiceCoverage } from '../../hooks/useServiceCoverage';

/**
 * Where a vendor declares the regions they serve.
 *
 * This is the only place that coverage can be kept current. An application
 * records it once at signup and `approve_vendor` copies it across, but nothing
 * afterwards — a vendor who expands beyond their home region had no way to say
 * so, and one who never stated a region at all was silently unreachable through
 * every location filter on the platform.
 *
 * Hence the empty-state warning: "no regions selected" isn't a neutral default,
 * it's the state that makes a vendor invisible to clients browsing by location,
 * and it should say so rather than look like an untouched form.
 */
export default function ServiceCoverageCard({ vendorId }: { vendorId: string }) {
  const {
    regions,
    selected,
    toggle,
    isDirty,
    submit,
    isLoading,
    error,
    busy,
    saveError,
    saved,
    dismissSaved,
  } = useServiceCoverage(vendorId);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={submit} noValidate>
          <Stack spacing={0.5}>
            <Typography variant="h6">Service coverage</Typography>
            <Typography variant="body2" color="text.secondary">
              The regions you work in. Clients filter by these when browsing vendors, so pick every
              region you&apos;ll travel to — not just where you&apos;re based.
            </Typography>
          </Stack>

          {/* Wraps an inner Stack, not the form's children directly: spacing
              only reaches a Stack's own children, so the controls would sit
              flush against each other one level down. */}
          <QueryState isLoading={isLoading} error={error}>
            <Stack spacing={2}>
              {saveError && (
                <Alert severity="error">
                  {saveError instanceof Error ? saveError.message : 'Could not save your coverage.'}
                </Alert>
              )}

              {selected.length === 0 && (
                <Alert severity="warning">
                  You haven&apos;t selected any regions, so you won&apos;t appear when clients
                  filter vendors by location. Pick at least one.
                </Alert>
              )}

              <RegionCheckboxGrid
                regions={regions}
                selected={selected}
                onToggle={toggle}
                disabled={busy}
              />

              <Button
                type="submit"
                variant="contained"
                disabled={busy || !isDirty}
                sx={{ alignSelf: 'flex-start' }}
              >
                {busy ? 'Saving…' : 'Save coverage'}
              </Button>
            </Stack>
          </QueryState>
        </Stack>

        <Snackbar
          open={saved}
          autoHideDuration={3000}
          onClose={dismissSaved}
          message="Service coverage updated"
        />
      </CardContent>
    </Card>
  );
}
