import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useServiceForm } from '../../hooks/useServiceForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The new-service fields and their write. */
export default function ServiceForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useServiceForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ControlledField name="title" control={control} label="Service title" autoFocus />
          <ControlledField
            name="description"
            control={control}
            label="Description"
            multiline
            minRows={3}
          />
          <ControlledField
            name="base_price"
            control={control}
            type="number"
            label="Base price (UGX)"
            inputProps={{ min: 0 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Saving…' : 'Add service'}
        </Button>
      </DialogActions>
    </Box>
  );
}
