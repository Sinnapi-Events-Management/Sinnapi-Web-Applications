import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import type { EventRequirementModel } from '@/lib/types';
import RequirementFormFields from '../molecules/RequirementFormFields';
import { useRequirementForm } from '../../hooks/useRequirementForm';

type Props = {
  eventId: string;
  editing: EventRequirementModel | null;
  currency: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Adding or editing one budget line.
 *
 * The form lives in a child that is mounted only while the dialog is open, so
 * its draft state is created and destroyed with the dialog — reopening after a
 * cancel shows what the line actually carries rather than a half-edited figure.
 * This is the same arrangement `EventPaymentTermsDialog` makes, and for the
 * same reason.
 *
 * Full screen below `sm`: the brief is a multiline field, and a floating card
 * on a phone gives it a cramped column inside a viewport-width sheet.
 */
export default function RequirementFormDialog({
  eventId,
  editing,
  currency,
  open,
  onClose,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        {editing ? 'Edit this line' : 'What else do you need?'}
        <Typography variant="body2" color="text.secondary">
          {editing
            ? 'Change what you have set aside, or how important it is.'
            : 'Add a service to your plan and set aside what you expect it to cost.'}
        </Typography>
      </DialogTitle>
      {/* Keyed so switching from one line straight to another rebuilds the
          fields instead of leaving the previous line's values in place. */}
      {open && (
        <RequirementFormBody
          key={editing?.id ?? 'new'}
          eventId={eventId}
          editing={editing}
          currency={currency}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

function RequirementFormBody({ eventId, editing, currency, onClose }: Omit<Props, 'open'>) {
  const form = useRequirementForm(eventId, editing, onClose);

  return (
    <form onSubmit={form.submit} noValidate>
      <DialogContent sx={{ pt: 1 }}>
        {form.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {form.error}
          </Alert>
        )}
        <RequirementFormFields
          control={form.control}
          categoryOptions={form.categoryOptions}
          isEdit={form.isEdit}
          disabled={form.busy || form.categoriesLoading}
          currency={currency}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={form.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={form.busy}>
          {form.busy ? 'Saving…' : form.isEdit ? 'Save changes' : 'Add to plan'}
        </Button>
      </DialogActions>
    </form>
  );
}
