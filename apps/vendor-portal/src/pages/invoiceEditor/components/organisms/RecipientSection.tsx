import type { Control, UseFormSetValue } from 'react-hook-form';
import { Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import RecipientFields from '@/components/documents/organisms/RecipientFields';
import type { RecipientValues } from '@/components/documents/schema/recipient';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';
import SectionCard from '../molecules/SectionCard';

/** Who the invoice is for, and the optional "For" line printed beside them. */
export default function RecipientSection({ f }: { f: InvoiceFormApi }) {
  return (
    <SectionCard title="Client">
      {f.isBookingInvoice ? (
        <>
          <Typography>
            <strong>{f.preview.recipient.name}</strong> — this invoice belongs to their booking.
          </Typography>
          <ControlledField
            name="recipient_address"
            control={f.control}
            label="Address on the document (optional)"
            disabled={f.busy}
          />
        </>
      ) : (
        <RecipientFields
          control={f.control as unknown as Control<RecipientValues>}
          setValue={f.setValue as unknown as UseFormSetValue<RecipientValues>}
          mode={f.values.recipient_mode}
          contactId={f.values.contact_id}
          clients={f.clients}
          contacts={f.contacts}
          disabled={f.busy}
        />
      )}
      <ControlledField
        name="title"
        control={f.control}
        label="For (optional)"
        placeholder="e.g. Wedding reception décor — 22 Nov 2026"
        disabled={f.busy}
      />
    </SectionCard>
  );
}
