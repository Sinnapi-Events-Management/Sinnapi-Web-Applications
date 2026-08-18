'use client';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import {
  PAYMENT_RAILS,
  extraCostSummary,
  paymentRailSpec,
  railTotal,
  type PaymentRail,
  type PaymentTermsPreview,
} from './paymentTerms';
import { PaymentRailOption } from './PaymentRailOption';

export type PaymentTermsPickerProps = {
  value: PaymentRail;
  onChange: (rail: PaymentRail) => void;
  /** Both rails priced for this booking's amount. Null while it loads. */
  preview: PaymentTermsPreview | null;
  isPricing?: boolean;
  disabled?: boolean;
  /**
   * Set when the terms come from the event and are not this booking's to
   * choose. The picker still renders — the client should see what they are
   * committed to — but it is inert and says why.
   */
  lockedReason?: string | null;
};

/**
 * How the client wants to pay, chosen before the vendor is asked to agree.
 *
 * Rendered as two cards side by side rather than a select, because the choice
 * is not between two names: it is between paying more for protection and paying
 * exactly the agreed amount for none. Both totals are on screen at once so that
 * comparison is a glance rather than an act of arithmetic.
 *
 * Layout only. The prices come from `payment_terms_preview` through whatever
 * hook the portal uses, and the copy comes from `paymentTerms.ts`.
 */
export function PaymentTermsPicker({
  value,
  onChange,
  preview,
  isPricing,
  disabled,
  lockedReason,
}: PaymentTermsPickerProps) {
  const isLocked = !!lockedReason;

  return (
    <Stack spacing={1.5}>
      {isLocked && <Alert severity="info">{lockedReason}</Alert>}

      {/* The first load has no figures to dim, so it gets a placeholder rather
          than two cards showing an em dash where the price belongs. Every later
          re-price keeps the cards mounted and fades the numbers, so the choice
          the client is part-way through making never jumps under them. */}
      {!preview && isPricing ? (
        <Skeleton variant="rounded" height={196} />
      ) : (
        <Stack
          role="radiogroup"
          aria-label="How you want to pay"
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems="stretch"
        >
          {PAYMENT_RAILS.map((rail) => (
            <PaymentRailOption
              key={rail}
              spec={paymentRailSpec(rail)}
              selected={value === rail}
              onSelect={() => onChange(rail)}
              disabled={disabled || isLocked}
              isPricing={isPricing}
              priceLabel={preview ? railTotal(preview, rail).display : undefined}
              extraLabel={extraCostSummary(preview, rail)}
            />
          ))}
        </Stack>
      )}

      <Typography variant="caption" color="text.secondary">
        Your vendor has to agree to this before the booking is confirmed. They can accept, propose
        the other way of paying, or decline.
      </Typography>
    </Stack>
  );
}
