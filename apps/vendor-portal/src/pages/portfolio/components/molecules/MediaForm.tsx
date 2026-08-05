import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { MEDIA_TYPE_OPTIONS } from '../../schema';
import { useMediaForm } from '../../hooks/useMediaForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The add-media fields and their write. */
export default function MediaForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useMediaForm(vendorId, onSuccess);

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
            name="media_type"
            control={control}
            label="Type"
            options={MEDIA_TYPE_OPTIONS}
          />
          <ControlledField
            name="url"
            control={control}
            label="Media URL"
            helperText="Upload to storage in production; paste a URL here for now"
          />
          <ControlledField name="caption" control={control} label="Caption" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Adding…' : 'Add'}
        </Button>
      </DialogActions>
    </Box>
  );
}
