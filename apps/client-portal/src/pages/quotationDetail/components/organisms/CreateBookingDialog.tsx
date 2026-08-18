import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@sinnapi/ui';
import type { QuotationPricing } from '@sinnapi/ui';
import type { EventRefModel, QuotationDetailModel, VendorRefModel } from '@/lib/types';
import PaymentTermsStep from '@/components/paymentTerms/components/organisms/PaymentTermsStep';
import { useCreateBookingFromQuotation } from '../../hooks/useCreateBookingFromQuotation';
import BookingCarryOver from '../molecules/BookingCarryOver';
import BookingScheduleFields from '../molecules/BookingScheduleFields';

type Props = {
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  event: EventRefModel | null;
  pricing: QuotationPricing;
  open: boolean;
  onClose: () => void;
};

/**
 * Scheduling an accepted quote, in one step.
 *
 * The form is mounted by the Dialog rather than beside it, so MUI's
 * unmount-on-close clears react-hook-form's state: reopening after a cancel
 * starts from the quote's own date again, not from a half-finished draft.
 *
 * Layout only — `useCreateBookingFromQuotation` owns the form, the write and
 * where the client lands afterwards.
 */
export default function CreateBookingDialog({
  quotation,
  vendor,
  event,
  pricing,
  open,
  onClose,
}: Props) {
  return (
    // Wider than it was: the dialog now carries a two-column price comparison
    // as well as the schedule, and squeezing the two rails into `sm` stacks
    // them — which turns a comparison into a list.
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Create booking from quote {quotation.reference_no}</DialogTitle>
      {/* Mounted only while open — see above. */}
      {open && (
        <CreateBookingForm
          quotation={quotation}
          vendor={vendor}
          event={event}
          pricing={pricing}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

/**
 * The dialog's body. Separate from the shell above so the hook that owns the
 * form is created and destroyed with the dialog's own open state, which is what
 * makes the reset above happen at all.
 */
function CreateBookingForm({
  quotation,
  vendor,
  event,
  pricing,
  onClose,
}: Omit<Props, 'open' | 'onClose'> & { onClose: () => void }) {
  const form = useCreateBookingFromQuotation(quotation, event, pricing.total, onClose);

  return (
    <Box component="form" onSubmit={form.submit} noValidate>
      <DialogContent>
        {form.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {form.error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The price is the one you accepted and cannot be changed here. Tell the vendor when and
          where, and how you want to pay — they will confirm all three.
        </Typography>

        <BookingCarryOver quotation={quotation} vendor={vendor} pricing={pricing} />

        <Divider sx={{ my: 2 }} />

        <Stack spacing={2}>
          <BookingScheduleFields
            control={form.control}
            slotMinutes={form.slotMinutes}
            endMinTime={form.endMinTime}
            endDisabled={form.endDisabled}
          />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <PaymentTermsStep
          choice={form.terms}
          advanceDaysBefore={quotation.advance_release_days_before}
          disabled={form.busy}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={form.busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disableElevation disabled={!form.canSubmit}>
          {form.busy ? 'Creating…' : 'Create booking'}
        </Button>
      </DialogActions>
    </Box>
  );
}
