import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { DISCOUNT_TYPE_OPTIONS } from '../../schema';
import { useDiscountForm } from '../../hooks/useDiscountForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The new-discount fields and their write. */
export default function DiscountForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, valueLabel, submit } = useDiscountForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ControlledField
            name="code"
            control={control}
            label="Code (optional)"
            helperText="Leave blank for an automatic discount with no code."
            autoFocus
          />
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ControlledField
              name="type"
              control={control}
              label="Type"
              options={DISCOUNT_TYPE_OPTIONS}
              sx={{ flex: 1 }}
            />
            <ControlledField
              name="value"
              control={control}
              type="number"
              label={valueLabel}
              sx={{ flex: 1 }}
              inputProps={{ min: 0 }}
            />
          </Stack>
          <ControlledField
            name="max_uses"
            control={control}
            type="number"
            label="Max uses (optional)"
            inputProps={{ min: 1 }}
          />
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ControlledField
              name="starts_at"
              control={control}
              type="date"
              label="Starts"
              InputLabelProps={{ shrink: true }}
            />
            <ControlledField
              name="ends_at"
              control={control}
              type="date"
              label="Ends"
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Saving…' : 'Create'}
        </Button>
      </DialogActions>
    </Box>
  );
}
