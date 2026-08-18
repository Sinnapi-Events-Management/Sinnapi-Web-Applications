import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  PaymentTermsBreakdown,
  PaymentTermsPicker,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { MyEventModel } from '@/lib/types';
import { useEventPaymentTerms } from '../../hooks/useEventPaymentTerms';

type Props = {
  event: MyEventModel;
  open: boolean;
  onClose: () => void;
};

/**
 * Payment terms for a whole event.
 *
 * Mounted only while open so the hook's draft state is created and destroyed
 * with the dialog — reopening after a cancel shows what the event actually
 * carries, not a half-edited rail.
 */
export default function EventPaymentTermsDialog({ event, open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Payment terms for {event.title}</DialogTitle>
      {open && <EventPaymentTermsForm event={event} onClose={onClose} />}
    </Dialog>
  );
}

function EventPaymentTermsForm({ event, onClose }: { event: MyEventModel; onClose: () => void }) {
  const form = useEventPaymentTerms(event, onClose);
  const budget = event.budget_max ?? event.budget_min;

  return (
    <>
      <DialogContent>
        <Stack spacing={2.5}>
          {form.error && <Alert severity="error">{form.error}</Alert>}

          <Typography variant="body2" color="text.secondary">
            Every booking you make under this event will use these terms, and vendors cannot propose
            different ones. Bookings a vendor has already confirmed keep what the two of you agreed
            — this only changes the ones still waiting for an answer.
          </Typography>

          <PaymentTermsPicker
            value={form.rail}
            onChange={form.setRail}
            preview={form.preview}
            isPricing={form.isPricing}
            disabled={form.busy}
          />

          {form.hasBudget ? (
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" fontWeight={700}>
                What that would cost on a {formatMoney(budget, event.currency)} booking
              </Typography>
              {/* An illustration, and labelled as one. The event has no agreed
                  amount — each booking under it is priced on its own figure —
                  so presenting this as "what you will pay" would be a number
                  nobody is going to be charged. */}
              <PaymentTermsBreakdown
                preview={form.preview}
                rail={form.rail}
                isLoading={form.isLoadingPreview}
                isPricing={form.isPricing}
                unavailableReason={form.unavailableReason}
              />
              <Typography variant="caption" color="text.secondary">
                Based on your stated budget. Each booking is priced on what that booking is actually
                worth.
              </Typography>
            </Stack>
          ) : (
            <Alert severity="info">
              Add a budget to this event and we will show you what each way of paying would come to.
              The choice above still applies either way.
            </Alert>
          )}

          {/* Optional, and worth having: a vendor reading "off platform" with no
              explanation is a vendor who declines rather than asks. */}
          <TextField
            label="Note for your vendors (optional)"
            value={form.note}
            onChange={(e) => form.setNote(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={form.busy}
            inputProps={{ maxLength: form.noteLimit }}
            helperText="Shown to every vendor you book under this event."
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={form.busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={form.save}
          disabled={form.busy || form.isUnchanged}
        >
          {form.busy ? 'Saving…' : form.isChange ? 'Update terms' : 'Set terms'}
        </Button>
      </DialogActions>
    </>
  );
}
