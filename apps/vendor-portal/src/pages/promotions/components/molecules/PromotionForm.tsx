import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { usePromotionForm } from '../../hooks/usePromotionForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The new-promotion fields and their write. */
export default function PromotionForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = usePromotionForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ControlledField name="title" control={control} label="Title" autoFocus />
          <ControlledField
            name="description"
            control={control}
            label="Description"
            multiline
            minRows={2}
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
