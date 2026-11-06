import { ControlledField } from '@sinnapi/ui/forms';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';
import SectionCard from '../molecules/SectionCard';

/**
 * How to pay and the small print. A booking invoice has no payment
 * instructions of its own: it is paid through Sinnapi, and the document
 * says so.
 */
export default function NotesSection({ f }: { f: InvoiceFormApi }) {
  return (
    <SectionCard title="Payment and notes">
      {!f.isBookingInvoice && (
        <ControlledField
          name="payment_instructions"
          control={f.control}
          label="How to pay you"
          placeholder={'Mobile Money: 07… (name)\nBank: …, A/C …'}
          multiline
          minRows={3}
          disabled={f.busy}
        />
      )}
      <ControlledField
        name="notes"
        control={f.control}
        label="Notes (optional)"
        multiline
        minRows={2}
        disabled={f.busy}
      />
      <ControlledField
        name="terms"
        control={f.control}
        label="Terms (optional)"
        multiline
        minRows={2}
        disabled={f.busy}
      />
    </SectionCard>
  );
}
