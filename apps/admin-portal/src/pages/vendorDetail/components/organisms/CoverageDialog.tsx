import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  Alert,
  Stack,
} from '@sinnapi/ui';
import type { ServiceRegionModel } from '@/lib/types';

type Props = {
  open: boolean;
  regions: ServiceRegionModel[];
  selected: string[];
  onToggle: (key: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  error: unknown;
};

/**
 * Staff editor for a vendor's service coverage.
 *
 * Checkboxes rather than a multi-select: there are only eight regions, an
 * operator is usually correcting one of them, and a list that shows every
 * option and its current state at once makes "what does this vendor cover"
 * answerable without opening a menu.
 */
export default function CoverageDialog({
  open,
  regions,
  selected,
  onToggle,
  onCancel,
  onConfirm,
  busy,
  error,
}: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Edit service coverage</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error != null && (
            <Alert severity="error">
              {error instanceof Error ? error.message : 'Could not save the coverage.'}
            </Alert>
          )}

          {selected.length === 0 && (
            <Alert severity="warning">
              With no regions selected this vendor won&apos;t appear when clients filter by
              location.
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              columnGap: 2,
            }}
          >
            {regions.map((region) => (
              <FormControlLabel
                key={region.key}
                control={
                  <Checkbox
                    checked={selected.includes(region.key)}
                    onChange={() => onToggle(region.key)}
                    disabled={busy}
                  />
                }
                label={region.name}
              />
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={busy} variant="contained">
          {busy ? 'Saving…' : 'Save coverage'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
