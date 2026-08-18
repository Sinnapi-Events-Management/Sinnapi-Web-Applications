import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateRangeField } from '@sinnapi/ui/forms';
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
          {/* The run of the promotion, picked as one span — see DiscountForm. */}
          <ControlledDateRangeField
            fromName="starts_at"
            toName="ends_at"
            control={control}
            label="Runs between"
            placeholder="Select the promotion window"
            helperText="The dates this promotion is shown to clients, inclusive."
          />
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
