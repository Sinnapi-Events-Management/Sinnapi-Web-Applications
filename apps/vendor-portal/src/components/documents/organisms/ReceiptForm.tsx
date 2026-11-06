import type { Control, UseFormSetValue } from 'react-hook-form';
import { Alert, Box, Button, Stack, Typography } from '@sinnapi/ui';
import { ControlledCheckbox, ControlledDateField, ControlledField } from '@sinnapi/ui/forms';
import { RECEIPT_METHOD_OPTIONS, kampalaToday, type ContactRow } from '@sinnapi/ui/documents';
import type { VendorClientModel } from '@/lib/types';
import { useReceiptForm, type LinkedInvoice } from '../hooks/useReceiptForm';
import { CURRENCY_OPTIONS } from '../schema/invoiceForm';
import type { RecipientValues } from '../schema/recipient';
import RecipientFields from './RecipientFields';
import OverpaymentConfirm from '../molecules/OverpaymentConfirm';

type Props = {
  linked: LinkedInvoice | null;
  clients?: VendorClientModel[];
  contacts?: ContactRow[];
  onDone: (result: { id: string; documentNo: string }) => void;
  onCancel: () => void;
};

/**
 * The fields of a receipt. Linked to an invoice, it asks only about the
 * payment; standalone, it asks who paid and what for, and lets the vendor
 * note what is still owed.
 */
export default function ReceiptForm({
  linked,
  clients = [],
  contacts = [],
  onDone,
  onCancel,
}: Props) {
  const f = useReceiptForm(linked, onDone);
  const today = kampalaToday();

  return (
    <Box component="form" noValidate onSubmit={f.submit}>
      <Stack spacing={2.5}>
        {!linked && (
          <RecipientFields
            control={f.control as unknown as Control<RecipientValues>}
            setValue={f.setValue as unknown as UseFormSetValue<RecipientValues>}
            mode={f.mode}
            contactId={f.contactId}
            clients={clients}
            contacts={contacts}
            disabled={f.busy}
          />
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          <ControlledField
            name="amount"
            control={f.control}
            label={`Amount received (${linked?.currency ?? f.currency})`}
            type="text"
            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
            disabled={f.busy}
            required
          />
          {!linked && (
            <ControlledField
              name="currency"
              control={f.control}
              label="Currency"
              options={CURRENCY_OPTIONS}
              disabled={f.busy}
            />
          )}
          <ControlledDateField
            name="payment_date"
            control={f.control}
            label="Payment date"
            maxDate={today}
            disabled={f.busy}
          />
          <ControlledField
            name="payment_method"
            control={f.control}
            label="How you were paid"
            options={RECEIPT_METHOD_OPTIONS}
            disabled={f.busy}
          />
          {f.showReference && (
            <ControlledField
              name="payment_reference"
              control={f.control}
              label="Transaction reference (recommended)"
              disabled={f.busy}
            />
          )}
        </Box>

        {f.balanceText && (
          <Typography
            variant="body2"
            color={f.overpaid ? 'warning.main' : 'text.secondary'}
            aria-live="polite"
          >
            {f.balanceText}
          </Typography>
        )}

        <ControlledField
          name="description"
          control={f.control}
          label={
            linked
              ? `What it was for (default: Payment for ${linked.documentNo})`
              : 'What this payment was for'
          }
          disabled={f.busy}
          required={!linked}
        />
        {!linked && (
          <ControlledField
            name="outstanding_balance"
            control={f.control}
            label="Still owed after this payment (optional)"
            type="text"
            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
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

        <ControlledCheckbox
          name="confirmed"
          control={f.control}
          label="I confirm I have received this payment."
          disabled={f.busy}
        />

        {f.error && <Alert severity="error">{f.error}</Alert>}

        {f.overpay ? (
          <OverpaymentConfirm
            owed={f.overpay.owed}
            overBy={f.overpay.overBy}
            busy={f.busy}
            onConfirm={f.overpay.confirm}
            onCancel={f.overpay.cancel}
          />
        ) : (
          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={f.busy} color="inherit">
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={f.busy}>
              {f.busy ? 'Recording…' : 'Record payment'}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
