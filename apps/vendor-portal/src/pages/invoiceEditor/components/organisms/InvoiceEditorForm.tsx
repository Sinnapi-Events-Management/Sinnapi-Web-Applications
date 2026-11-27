import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  ConfirmDialog,
  LinearProgress,
  Paper,
  Stack,
  Toast,
  Typography,
} from '@sinnapi/ui';
import { aboveBottomNav } from '@sinnapi/ui/router';
import {
  InvoicePreview,
  formatDocumentMoney,
  type ContactRow,
  type InvoiceRow,
} from '@sinnapi/ui/documents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { VendorClientModel } from '@/lib/types';
import type { useVendorBusinessCard } from '@/hooks/documentQueries';
import { missingList } from '@/components/forms/missingList';
import { useMissingSnapshot } from '@/components/forms/useMissingSnapshot';
import { useInvoiceForm } from '../../hooks/useInvoiceForm';
import SectionCard from '../molecules/SectionCard';
import RecipientSection from './RecipientSection';
import ItemsSection from './ItemsSection';
import DueDateSection from './DueDateSection';
import NotesSection from './NotesSection';
import MoreOptionsSection from './MoreOptionsSection';

type Props = {
  row: InvoiceRow | null;
  clients: VendorClientModel[];
  contacts: ContactRow[];
  card: ReturnType<typeof useVendorBusinessCard>['data'];
};

const STEPS = ['Who is paying', 'What for', 'Check & create'] as const;

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
    'title',
  ],
  [
    'items',
    'issue_date',
    'due_date',
    'currency',
    'discount_type',
    'discount_value',
    'tax_label',
    'tax_rate',
    'payment_instructions',
    'notes',
    'terms',
  ],
] as const;

const LABELS: Record<string, string> = {
  client_id: 'Client',
  recipient_name: 'Name',
  recipient_email: 'Email',
  recipient_phone: 'Phone',
  title: 'What it is for',
  issue_date: 'Invoice date',
  due_date: 'Pay by',
  discount_value: 'Discount',
  tax_rate: 'Tax',
  payment_instructions: 'How to pay you',
};
const ITEM_LABELS = { description: 'what it is', quantity: 'how many', unit_price: 'price' };

/**
 * New / draft invoice in three steps (approved 2026-11-17): who is paying →
 * what for → check & create. It used to be one ~2,800px form with five open
 * sections and the Issue button in two places. "Save for later" (the draft)
 * is on every step.
 */
export default function InvoiceEditorForm(props: Props) {
  const f = useInvoiceForm(props);
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  const { missing, refused, clear } = useMissingSnapshot(() =>
    step < STEP_FIELDS.length ? missingList(f.errors, STEP_FIELDS[step], LABELS, ITEM_LABELS) : [],
  );

  const next = async () => {
    const ok = await f.validate(STEP_FIELDS[step] as never);
    if (ok) {
      clear();
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      refused();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const back = () => {
    clear();
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Box component="form" noValidate onSubmit={f.saveDraft} sx={{ maxWidth: 820, pb: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </Typography>
          <LinearProgress
            variant="determinate"
            color="secondary"
            value={((step + 1) / STEPS.length) * 100}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        </Box>

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
        {f.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {f.error}
          </Alert>
        )}

        {step === 0 && <RecipientSection f={f} />}

        {step === 1 && (
          <Stack spacing={2.25}>
            <ItemsSection f={f} />
            <SectionCard title="Payment">
              <DueDateSection f={f} />
              <NotesSection f={f} />
            </SectionCard>
            <Accordion
              disableGutters
              variant="outlined"
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography fontWeight={700}>More options</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Discount, tax, currency, invoice date, notes
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <MoreOptionsSection f={f} />
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            <Typography color="text.secondary">
              This is the invoice your client will get. If something is wrong, go back and change
              it.
            </Typography>
            <InvoicePreview invoice={f.preview} />
            {f.invoiceId && (
              <Button
                color="error"
                onClick={f.askDelete}
                disabled={f.busy}
                size="small"
                sx={{ alignSelf: 'flex-start' }}
              >
                Delete this draft
              </Button>
            )}
          </Stack>
        )}
      </Box>

      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          left: { xs: 12, md: 'auto' },
          right: { xs: 12, md: 24 },
          bottom: { xs: aboveBottomNav(12), md: 24 },
          width: { md: 520 },
          zIndex: (t) => t.zIndex.appBar - 1,
          p: 1.25,
          borderRadius: 3,
        }}
      >
        {/* Total and "Save for later" share the top line so the buttons below
            keep one short word each — three buttons in a row wrapped onto two
            lines at 360px. */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ px: 0.5, mb: 1 }}
        >
          <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary', mr: 1 }}>
              Total
            </Box>
            {formatDocumentMoney(f.preview.total, f.preview.currency)}
          </Typography>
          <Button
            size="small"
            onClick={() => void f.saveDraft()}
            disabled={f.busy}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {f.saving && !f.issuing ? 'Saving…' : 'Save for later'}
          </Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          {step > 0 && (
            <Button
              variant="outlined"
              onClick={back}
              disabled={f.busy}
              sx={{ minHeight: 48, flex: 1 }}
            >
              Back
            </Button>
          )}
          {last ? (
            <Button
              variant="contained"
              color="success"
              onClick={() => void f.requestIssue()}
              disabled={f.busy}
              sx={{ minHeight: 48, flex: 2, whiteSpace: 'nowrap' }}
            >
              {f.issuing ? 'Creating…' : 'Create invoice'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              onClick={() => void next()}
              disabled={f.busy}
              sx={{ minHeight: 48, flex: 2 }}
            >
              Next
            </Button>
          )}
        </Stack>
      </Paper>

      <ConfirmDialog
        open={f.confirmIssue}
        title="Create this invoice?"
        description={`It gets an invoice number for ${formatDocumentMoney(f.preview.total, f.preview.currency)} and can no longer be changed. To change it later, you cancel it and make a new one. Sending it to the client is the next step.`}
        confirmLabel="Create invoice"
        loading={f.busy}
        onConfirm={f.doIssue}
        onCancel={f.cancelIssue}
      />
      <ConfirmDialog
        open={f.confirmDelete}
        title="Delete this draft?"
        description="It was never created, so nothing has been sent to anyone."
        confirmLabel="Delete draft"
        destructive
        loading={f.deleting}
        onConfirm={f.doDelete}
        onCancel={f.cancelDelete}
      />
      <Toast toast={f.toast} onClose={f.dismissToast} />
    </>
  );
}
