import { Box, Button, DialogContent, DialogActions, Alert, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useTemplateForm } from '../../hooks/useTemplateForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
};

/** The new-template fields and their write. */
export default function TemplateForm({ vendorId, onCancel, onSuccess }: Props) {
  const { control, error, busy, submit } = useTemplateForm(vendorId, onSuccess);

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ControlledField name="name" control={control} label="Template name" autoFocus />
          <ControlledField name="notes" control={control} label="Notes" multiline minRows={3} />
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
