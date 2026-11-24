import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import { useQuotationForm } from './hooks/useQuotationForm';
import { useMissingSnapshot } from '@/components/forms/useMissingSnapshot';
import BuilderItemsStep from './components/organisms/BuilderItemsStep';
import BuilderReviewStep from './components/organisms/BuilderReviewStep';
import AdvanceTermsFields from './components/molecules/AdvanceTermsFields';
import type { QuotationFormValues } from './schema';

type Props = {
  open: boolean;
  onClose: () => void;
  quotationId: string;
  currency?: string;
  vendorId?: string | null;
  requestedPackageId?: string | null;
  requestedTierId?: string | null;
  /** Start from the quote already sent (changes asked, or an expired price). */
  initialValues?: QuotationFormValues;
  /** The client's own words, shown while the vendor prices them. */
  clientRequest?: string | null;
  clientName?: string;
  /** Dialog heading, e.g. "Price this request" or "Update your quote". */
  title?: string;
};

type FormErrors = ReturnType<typeof useQuotationForm>['errors'];

/** The step's validation errors as short sentences a vendor can act on. */
function missingList(errors: FormErrors, step: number): string[] {
  const out: string[] = [];
  if (step === 0) {
    const items = Array.isArray(errors.items) ? errors.items : [];
    items.forEach((e, i) => {
      if (!e) return;
      const n = `Item ${i + 1}`;
      if (e.description) out.push(`${n}: write what you will provide.`);
      if (e.quantity) out.push(`${n}: how many — ${e.quantity.message}`);
      if (e.unit_price) out.push(`${n}: price for one — ${e.unit_price.message}`);
    });
    const root = errors.items?.root?.message ?? errors.items?.message;
    if (root) out.push(root);
    if (errors.discount_rate) out.push(`Discount: ${errors.discount_rate.message}`);
    if (errors.tax_rate) out.push(`Tax: ${errors.tax_rate.message}`);
    if (errors.valid_days) out.push(`Price is valid for: ${errors.valid_days.message}`);
  } else {
    if (errors.advance_rate) out.push(`Advance: ${errors.advance_rate.message}`);
    if (errors.advance_release_days_before) {
      out.push(`Days before the event: ${errors.advance_release_days_before.message}`);
    }
    if (errors.advance_terms_note) out.push(`Message: ${errors.advance_terms_note.message}`);
  }
  return out;
}

const STEPS = ['What you will provide', 'When you get paid', 'Check & send'] as const;

/** The fields each step owns, validated before moving on. */
const STEP_FIELDS: (keyof QuotationFormValues)[][] = [
  ['items', 'discount_rate', 'tax_rate', 'valid_days'],
  ['advance_rate', 'advance_release_days_before', 'advance_terms_note'],
];

/**
 * The quote builder, in three steps (approved 2026-11-17). It used to be one
 * long form inside the Quote tab with every field showing at once, and "Send
 * quote" sent with no chance to check. Full screen on phones, a dialog on
 * larger screens; the Back/Next bar stays at the bottom either way.
 */
export default function QuotationBuilder({
  open,
  onClose,
  quotationId,
  currency = 'UGX',
  vendorId,
  requestedPackageId,
  requestedTierId,
  initialValues,
  clientRequest = null,
  clientName = 'The client',
  title = 'Price this request',
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [step, setStep] = useState(0);

  const form = useQuotationForm(quotationId, {
    vendorId: vendorId ?? undefined,
    requestedPackageId,
    requestedTierId,
    initialValues,
    onSent: () => {
      setStep(0);
      onClose();
    },
  });

  // Form fields only show their own errors after a real submit (see
  // `useFieldError`), and Next is not a submit — so a refused step says, in
  // one list at the top, exactly what to fix. Without this the button simply
  // did nothing.
  const { missing, refused, clear } = useMissingSnapshot(() => missingList(form.errors, step));

  const next = async () => {
    const ok = await form.validate(STEP_FIELDS[step]);
    if (ok) {
      clear();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
      return;
    }
    refused();
    document.getElementById('quote-builder-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => {
    clear();
    setStep((s) => Math.max(s - 1, 0));
  };
  const last = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onClose={form.busy ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      aria-labelledby="quote-builder-title"
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          pt: 2,
          pb: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography id="quote-builder-title" variant="h6" fontWeight={700} noWrap>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} disabled={form.busy}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <LinearProgress
          variant="determinate"
          color="secondary"
          value={((step + 1) / STEPS.length) * 100}
          sx={{ mt: 1.5, height: 6, borderRadius: 3 }}
        />
      </Box>

      <DialogContent id="quote-builder-content" sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Box component="form" noValidate onSubmit={form.submit}>
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
          {form.itemsError && step === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {form.itemsError}
            </Alert>
          )}
          {step === 0 && (
            <BuilderItemsStep form={form} currency={currency} clientRequest={clientRequest} />
          )}
          {step === 1 && (
            <AdvanceTermsFields
              control={form.control}
              setValue={form.setValue}
              total={form.pricing.total}
              currency={currency}
              rate={form.advanceRate}
              daysBefore={form.advanceDays}
              advanceRateMax={form.advanceRateMax}
            />
          )}
          {step === 2 && (
            <BuilderReviewStep form={form} currency={currency} clientName={clientName} />
          )}
        </Box>
      </DialogContent>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          pb: { xs: 'calc(12px + env(safe-area-inset-bottom))', sm: 1.5 },
        }}
      >
        {step > 0 && (
          <Button onClick={back} disabled={form.busy} sx={{ minHeight: 48, flex: 1 }}>
            Back
          </Button>
        )}
        {last ? (
          <Button
            variant="contained"
            color="success"
            onClick={() => void form.submit()}
            disabled={form.busy}
            sx={{ minHeight: 48, flex: 2 }}
          >
            {form.busy ? 'Sending…' : `Send to ${clientName}`}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => void next()}
            sx={{ minHeight: 48, flex: 2 }}
          >
            Next
          </Button>
        )}
      </Stack>
    </Dialog>
  );
}
