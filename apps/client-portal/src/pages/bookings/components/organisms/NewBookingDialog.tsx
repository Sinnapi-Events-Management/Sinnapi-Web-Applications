import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@sinnapi/ui';
import PaymentTermsStep from '@/components/paymentTerms/components/organisms/PaymentTermsStep';
import { useNewBooking } from '../../hooks/useNewBooking';
import NewBookingFields from '../molecules/NewBookingFields';

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Booking a vendor without a quote behind it.
 *
 * The form is mounted by the Dialog rather than beside it, so MUI's
 * unmount-on-close clears react-hook-form's state: reopening after a cancel
 * starts blank rather than from a half-finished draft — and, more to the point
 * here, from a half-agreed set of payment terms.
 */
export default function NewBookingDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>New booking</DialogTitle>
      {/* Mounted only while open — see above. */}
      {open && <NewBookingForm onClose={onClose} />}
    </Dialog>
  );
}

/**
 * The dialog's body. Separate from the shell above so the hook that owns the
 * form is created and destroyed with the dialog's own open state, which is what
 * makes the reset above happen at all.
 */
function NewBookingForm({ onClose }: { onClose: () => void }) {
  const form = useNewBooking(onClose);

  return (
    <Box component="form" onSubmit={form.submit} noValidate>
      <DialogContent>
        {form.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {form.error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Tell us who you want, when, and how you want to pay. The vendor confirms all three before
          anything is held.
        </Typography>

        <NewBookingFields
          control={form.control}
          events={form.events}
          slotMinutes={form.slotMinutes}
          endMinTime={form.endMinTime}
          endDisabled={form.endDisabled}
          disabled={form.busy}
        />

        <Divider sx={{ my: 3 }} />

        {/* Without an amount there is nothing to price, and two cards reading
            "UGX 0" would present the choice as costing nothing either way. */}
        {form.hasAmount ? (
          <PaymentTermsStep choice={form.terms} disabled={form.busy} />
        ) : (
          <Alert severity="info">
            Enter what you expect this to cost and we will show you exactly what each way of paying
            would come to.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={form.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disableElevation disabled={!form.canSubmit}>
          {form.busy ? 'Sending…' : 'Send request'}
        </Button>
      </DialogActions>
    </Box>
  );
}
