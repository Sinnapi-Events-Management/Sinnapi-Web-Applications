import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  Divider,
  PaymentTermsPicker,
  Stack,
  Typography,
} from '@sinnapi/ui';
import type { MyEventModel } from '@/lib/types';
import { useEventPaymentTerms } from '../../hooks/useEventPaymentTerms';
import EventBudgetSection from '../molecules/EventBudgetSection';
import EventTermsCostPreview from '../molecules/EventTermsCostPreview';
import EventTermsNoteField from '../molecules/EventTermsNoteField';

type Props = {
  event: MyEventModel;
  onClose: () => void;
};

/**
 * Budget, then rail, then what the two come to together.
 *
 * The order is the argument: a client states what they expect to spend, picks
 * how they want to pay it, and reads the cost of that pairing without leaving
 * the dialog. Reversing it — terms first, budget last — would price every card
 * at nothing until the very last field was filled.
 *
 * All state lives in `useEventPaymentTerms`, which owns the budget form as
 * well, so this file is layout and copy only.
 */
export default function EventPaymentTermsForm({ event, onClose }: Props) {
  const form = useEventPaymentTerms(event, onClose);

  return (
    <>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {form.error && <Alert severity="error">{form.error}</Alert>}

          <EventBudgetSection control={form.budget.control} disabled={form.busy} />

          <Divider flexItem />

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

          <EventTermsCostPreview
            amount={form.budget.previewAmount}
            currency={form.budget.currency}
            rail={form.rail}
            preview={form.preview}
            isLoading={form.isLoadingPreview}
            isPricing={form.isPricing}
            unavailableReason={form.unavailableReason}
          />

          <EventTermsNoteField
            value={form.note}
            onChange={form.setNote}
            limit={form.noteLimit}
            disabled={form.busy}
          />
        </Stack>
      </DialogContent>

      {/* Full-width stacked buttons on a phone, where a 44px target at the
          bottom of the sheet is the only thing a thumb can reach comfortably. */}
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          sx={{ width: '100%', justifyContent: 'flex-end' }}
        >
          <Button onClick={onClose} disabled={form.busy} fullWidth={false} sx={{ minWidth: 96 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={form.save}
            disabled={form.busy || form.isUnchanged}
            sx={{ minWidth: 140 }}
          >
            {form.busy ? 'Saving…' : form.saveLabel}
          </Button>
        </Stack>
      </DialogActions>
    </>
  );
}
