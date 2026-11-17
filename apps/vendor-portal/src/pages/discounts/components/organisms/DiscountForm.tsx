import { useState, type ReactNode } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  LinearProgress,
  Stack,
  Typography,
} from '@sinnapi/ui';
import { ControlledDateRangeField, ControlledField } from '@sinnapi/ui/forms';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OfferTargetPicker from '@/components/offers/organisms/OfferTargetPicker';
import { missingList } from '@/components/forms/missingList';
import { useMissingSnapshot } from '@/components/forms/useMissingSnapshot';
import { formatDate, formatMoney } from '@/lib/config';
import type { PromotionModel } from '@/lib/types';
import { useDiscountForm } from '../../hooks/useDiscountForm';
import { DISCOUNT_TYPE_OPTIONS, type DiscountRow } from '../../schema';

type Props = {
  vendorId: string;
  discount: DiscountRow | null;
  promotions: PromotionModel[];
  onCancel: () => void;
  onSuccess: (warning?: string) => void;
};

const STEPS = ['How much off', 'On what and when', 'Check & save'] as const;
const STEP_FIELDS = [
  ['title', 'type', 'value', 'code', 'is_automatic'],
  [
    'starts_at',
    'ends_at',
    'promotion_id',
    'max_uses',
    'max_per_client',
    'min_amount',
    'max_discount_amount',
    'description',
  ],
] as const;
const LABELS: Record<string, string> = {
  title: 'Offer name',
  value: 'How much off',
  code: 'Code',
  starts_at: 'Start date',
  ends_at: 'End date',
  max_uses: 'How many times',
  max_per_client: 'Per client',
  min_amount: 'Smallest booking',
  max_discount_amount: 'Most taken off',
};
const PERCENT_PRESETS = [10, 15, 20, 25];

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
 * New / edit offer in three steps (approved 2026-11-17): how much off and how
 * clients get it → on what and when → check & save. It used to be one long
 * form with fourteen fields, where "Apply automatically" sat under the code
 * and changed what the code field meant.
 */
export default function DiscountForm({
  vendorId,
  discount,
  promotions,
  onCancel,
  onSuccess,
}: Props) {
  const f = useDiscountForm(vendorId, discount, promotions, onSuccess);
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;
  const v = f.values;
  const { missing, refused, clear } = useMissingSnapshot(() =>
    step < STEP_FIELDS.length ? missingList(f.errors, STEP_FIELDS[step], LABELS) : [],
  );

  const next = async () => {
    const ok = await f.validate(STEP_FIELDS[step] as never);
    if (ok) clear();
    else refused();
    if (ok) setStep((s) => s + 1);
  };

  const how = f.isAutomatic ? 'auto' : 'code';
  const amountText =
    v.type === 'fixed'
      ? `${formatMoney(Number(v.value) || 0)} off`
      : `${Number(v.value) || 0}% off`;
  const sale = f.promotionOptions.find((o) => o.value === v.promotion_id && o.value !== '');

  return (
    <Box component="form" onSubmit={f.submit} noValidate>
      <DialogContent dividers>
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
        {f.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {f.error}
          </Alert>
        )}

        {step === 0 && (
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <ControlledField
                name="type"
                control={f.control}
                label="Take off"
                options={DISCOUNT_TYPE_OPTIONS}
                sx={{ flex: 1, width: '100%' }}
              />
              <ControlledField
                name="value"
                control={f.control}
                type="number"
                label={f.valueLabel}
                sx={{ flex: 1, width: '100%' }}
                inputProps={{ min: 0, inputMode: 'decimal' }}
              />
            </Stack>
            {v.type !== 'fixed' && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {PERCENT_PRESETS.map((n) => (
                  <Chip
                    key={n}
                    label={`${n}%`}
                    clickable
                    color={Number(v.value) === n ? 'secondary' : 'default'}
                    variant={Number(v.value) === n ? 'filled' : 'outlined'}
                    onClick={() =>
                      f.setValue('value', String(n) as never, { shouldValidate: true })
                    }
                    sx={{ height: 40, minWidth: 56 }}
                  />
                ))}
              </Stack>
            )}

            <ControlledField
              name="title"
              control={f.control}
              label="Offer name (clients see this)"
              placeholder="e.g. Early-bird 10% off"
            />

            <Box>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                How do clients get it?
              </Typography>
              <Stack spacing={1} role="radiogroup" aria-label="How do clients get it?">
                {(
                  [
                    {
                      key: 'auto',
                      title: 'Automatically',
                      text: 'Everyone sees the lower price. Nothing to type.',
                    },
                    {
                      key: 'code',
                      title: 'With a code',
                      text: 'Only clients who type your code get it — good for posters and WhatsApp.',
                    },
                  ] as const
                ).map((o) => (
                  <Box
                    key={o.key}
                    role="radio"
                    aria-checked={how === o.key}
                    tabIndex={0}
                    onClick={() =>
                      f.setValue('is_automatic', o.key === 'auto', { shouldValidate: true })
                    }
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      f.setValue('is_automatic', o.key === 'auto', { shouldValidate: true })
                    }
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: 2,
                      borderColor: how === o.key ? 'secondary.main' : 'divider',
                    }}
                  >
                    <Typography fontWeight={700}>{o.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {o.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <ControlledField
              name="code"
              control={f.control}
              label={f.isAutomatic ? 'Code for posters (optional)' : 'The code clients type'}
              disabled={f.codeLocked}
              placeholder="EARLY-BIRD"
              helperText={
                f.codeLocked
                  ? 'Clients have already used this code, so it can no longer be changed.'
                  : undefined
              }
            />
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2.5}>
            <ControlledDateRangeField
              fromName="starts_at"
              toName="ends_at"
              control={f.control}
              label="When does it run?"
              placeholder="Pick the first and last day"
            />
            <OfferTargetPicker
              packages={f.packages}
              services={f.services}
              selected={f.picker.selected}
              onToggle={f.picker.toggle}
              onClear={f.picker.clear}
              isLoading={f.catalogueLoading}
            />
            <ControlledField
              name="promotion_id"
              control={f.control}
              label="Part of a sale name (optional)"
              options={f.promotionOptions}
              helperText="Group it under a sale such as “Festive Season” to show its picture on your page."
            />
            <Accordion
              disableGutters
              variant="outlined"
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography fontWeight={700}>More limits</Typography>
                  <Typography variant="body2" color="text.secondary">
                    How many times, smallest booking, description
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <ControlledField
                    name="max_uses"
                    control={f.control}
                    type="number"
                    label="How many times in total (blank = no limit)"
                    inputProps={{ min: 1, inputMode: 'numeric' }}
                  />
                  <ControlledField
                    name="max_per_client"
                    control={f.control}
                    type="number"
                    label="Times one client can use it (optional)"
                    inputProps={{ min: 1, inputMode: 'numeric' }}
                  />
                  <ControlledField
                    name="min_amount"
                    control={f.control}
                    type="number"
                    label="Only for bookings of at least (UGX, optional)"
                    inputProps={{ min: 0, inputMode: 'decimal' }}
                  />
                  {!f.isFixed && (
                    <ControlledField
                      name="max_discount_amount"
                      control={f.control}
                      type="number"
                      label="Never take off more than (UGX, optional)"
                      inputProps={{ min: 0, inputMode: 'decimal' }}
                    />
                  )}
                  <ControlledField
                    name="description"
                    control={f.control}
                    label="Description (optional)"
                    multiline
                    minRows={2}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={1.5}>
            <Typography color="text.secondary">Check your offer before saving it.</Typography>
            <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Typography variant="h5" fontWeight={700}>
                {amountText}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {v.title || 'Untitled offer'}
              </Typography>
              <Row label="Clients get it">
                {f.isAutomatic
                  ? `Automatically${v.code ? ` (also code ${v.code})` : ''}`
                  : `By typing ${v.code || '—'}`}
              </Row>
              <Row label="Runs">
                {v.starts_at ? formatDate(v.starts_at) : '—'} –{' '}
                {v.ends_at ? formatDate(v.ends_at) : '—'}
              </Row>
              <Row label="On">
                {f.picker.selected.size === 0
                  ? 'Everything you sell'
                  : `${f.picker.selected.size} package${f.picker.selected.size === 1 ? '' : 's'} or service${f.picker.selected.size === 1 ? '' : 's'}`}
              </Row>
              {v.max_uses && <Row label="Times in total">{v.max_uses}</Row>}
              {v.min_amount && (
                <Row label="Smallest booking">{formatMoney(Number(v.min_amount))}</Row>
              )}
              {sale && <Row label="Sale name">{sale.label}</Row>}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={() => {
            clear();
            if (step === 0) onCancel();
            else setStep((s) => s - 1);
          }}
          disabled={f.busy}
          color="inherit"
          sx={{ minHeight: 44 }}
        >
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {last ? (
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={f.busy}
            sx={{ minHeight: 44 }}
          >
            {f.busy ? 'Saving…' : f.isEdit ? 'Save changes' : 'Save offer'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => void next()}
            sx={{ minHeight: 44, px: 4 }}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Box>
  );
}
