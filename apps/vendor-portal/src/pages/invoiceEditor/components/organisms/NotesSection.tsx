import { ControlledField } from '@sinnapi/ui/forms';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';

/**
 * How the client should pay — printed on the invoice. Booking invoices are
 * paid through Sinnapi, so they have none. Notes and terms moved to "More
 * options".
 */
export default function NotesSection({ f }: { f: InvoiceFormApi }) {
  if (f.isBookingInvoice) return null;
  return (
    <ControlledField
      name="payment_instructions"
      control={f.control}
      label="How to pay you"
      placeholder={'Mobile Money: 07… (name)\nBank: …, A/C …'}
      helperText="Printed on the invoice, so the client knows where to send the money."
      multiline
      minRows={3}
      disabled={f.busy}
    />
  );
}
