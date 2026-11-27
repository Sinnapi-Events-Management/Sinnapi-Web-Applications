import { useState, type ReactNode } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  LinearProgress,
  Stack,
  Typography,
} from '@sinnapi/ui';
import { ControlledCheckbox, ControlledDateField, ControlledField } from '@sinnapi/ui/forms';
import {
  RECEIPT_METHOD_LABELS,
  RECEIPT_METHOD_OPTIONS,
  amountInWords,
  formatDocumentDate,
  formatDocumentMoney,
  kampalaToday,
  type ContactRow,
} from '@sinnapi/ui/documents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { VendorClientModel } from '@/lib/types';
import { missingList } from '@/components/forms/missingList';
import { useMissingSnapshot } from '@/components/forms/useMissingSnapshot';
import { useReceiptForm } from '../hooks/useReceiptForm';
import { CURRENCY_OPTIONS } from '../schema/invoiceForm';
import type { RecipientValues } from '../schema/recipient';
import RecipientFields from './RecipientFields';

type Props = {
  clients: VendorClientModel[];
  contacts: ContactRow[];
  onDone: (result: { id: string; documentNo: string }) => void;
  onCancel: () => void;
};

const STEPS = ['Who paid you', 'The payment', 'Check & save'] as const;
const STEP_FIELDS = [
  [
    'recipient_mode',
    'client_id',
    'contact_id',
    'recipient_name',
    'recipient_company',
    'recipient_email',
    'recipient_phone',
    'recipient_address',
  ],
  [
    'amount',
    'currency',
    'payment_date',
    'payment_method',
    'payment_reference',
    'description',
    'outstanding_balance',
    'notes',
  ],
] as const;
const LABELS: Record<string, string> = {
  client_id: 'Client',
  recipient_name: 'Name',
  recipient_email: 'Email',
  amount: 'Amount',
  payment_date: 'Date',
  payment_method: 'How you were paid',
  description: 'What it was for',
  outstanding_balance: 'Still owed',
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      spacing={2}
      sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}
    >
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={600} sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * A receipt for money received outside an invoice, in three steps (approved
 * 2026-11-17): who paid → the payment → check & save. It used to be twelve
 * fields on one screen. Recording a payment *on an invoice* keeps the short
 * single form in `ReceiptForm`.
 */
export default function NewReceiptSteps({ clients, contacts, onDone, onCancel }: Props) {
  const f = useReceiptForm(null, onDone);
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const v = f.values;
  const { missing, refused, clear } = useMissingSnapshot(() =>
    step < STEP_FIELDS.length ? missingList(f.errors, STEP_FIELDS[step], LABELS) : [],
  );
  const amount = Number(String(v.amount ?? '').replace(/,/g, '')) || 0;

  const next = async () => {
    const ok = await f.validate(STEP_FIELDS[step] as never);
    if (ok) clear();
    else refused();
    if (ok) setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box component="form" noValidate onSubmit={f.submit}>
      <Typography variant="body2" color="text.secondary">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </Typography>
      <LinearProgress
        variant="determinate"
        color="secondary"
        value={((step + 1) / STEPS.length) * 100}
        sx={{ mt: 1, mb: 2.5, height: 6, borderRadius: 3 }}
      />

      {missing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <b>Please fix this first:</b>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </Box>
        </Alert>
      )}

      {step === 0 && (
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

      {step === 1 && (
        <Stack spacing={2}>
          <ControlledField
            name="amount"
            control={f.control}
            label={`How much did you receive? (${f.currency})`}
            type="text"
            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
            disabled={f.busy}
            required
          />
          <ControlledField
            name="payment_method"
            control={f.control}
            label="How were you paid?"
            options={RECEIPT_METHOD_OPTIONS}
            disabled={f.busy}
          />
          {f.showReference && (
            <ControlledField
              name="payment_reference"
              control={f.control}
              label="Transaction ID (from the SMS or bank slip)"
              disabled={f.busy}
            />
          )}
          <ControlledDateField
            name="payment_date"
            control={f.control}
            label="When?"
            maxDate={kampalaToday()}
            disabled={f.busy}
          />
          <ControlledField
            name="description"
            control={f.control}
            label="What was it for?"
            placeholder="e.g. Deposit for wedding photography"
            disabled={f.busy}
            required
          />
          <Accordion
            disableGutters
            variant="outlined"
            sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <Typography fontWeight={700}>Add more details</Typography>
                <Typography variant="body2" color="text.secondary">
                  Money still owed, currency, notes
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <ControlledField
                  name="outstanding_balance"
                  control={f.control}
                  label="Money still owed after this payment"
                  type="text"
                  inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                  disabled={f.busy}
                />
                <ControlledField
                  name="currency"
                  control={f.control}
                  label="Currency"
                  options={CURRENCY_OPTIONS}
                  disabled={f.busy}
                />
                <ControlledField
                  name="notes"
                  control={f.control}
                  label="Notes (optional)"
                  multiline
                  minRows={2}
                  disabled={f.busy}
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Check the receipt before you save it. A saved receipt gets a number and cannot be
            changed.
          </Typography>
          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatDocumentMoney(amount, f.currency)}
            </Typography>
            {amount > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {amountInWords(amount, f.currency)}
              </Typography>
            )}
            <Row label="From">{v.recipient_name || '—'}</Row>
            <Row label="Paid by">
              {v.payment_method
                ? RECEIPT_METHOD_LABELS[v.payment_method as keyof typeof RECEIPT_METHOD_LABELS]
                : '—'}
            </Row>
            <Row label="Date">{formatDocumentDate(v.payment_date)}</Row>
            <Row label="For">{v.description || '—'}</Row>
            {v.outstanding_balance && (
              <Row label="Still owed">
                {formatDocumentMoney(
                  Number(String(v.outstanding_balance).replace(/,/g, '')) || 0,
                  f.currency,
                )}
              </Row>
            )}
          </Box>
          <ControlledCheckbox
            name="confirmed"
            control={f.control}
            label="I confirm I have received this money."
            disabled={f.busy}
          />
          {f.error && <Alert severity="error">{f.error}</Alert>}
        </Stack>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <Button
          onClick={() => {
            clear();
            if (step === 0) onCancel();
            else setStep((s) => s - 1);
          }}
          disabled={f.busy}
          color="inherit"
          sx={{ minHeight: 48 }}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Box sx={{ flex: 1 }} />
        {last ? (
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={f.busy}
            sx={{ minHeight: 48, px: 3 }}
          >
            {f.busy ? 'Saving…' : 'Save receipt'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => void next()}
            sx={{ minHeight: 48, px: 4 }}
          >
            Next
          </Button>
        )}
      </Stack>
    </Box>
  );
}
