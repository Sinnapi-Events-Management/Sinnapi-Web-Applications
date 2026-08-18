'use client';
import { Box, Radio, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  PAYMENT_RAILS,
  paymentRailSpec,
  railLabelFor,
  type PaymentRail,
  type PaymentTermsActor,
} from './paymentTerms';

export type PaymentRailChoiceProps = {
  value: PaymentRail | null;
  onChange: (rail: PaymentRail) => void;
  actor: PaymentTermsActor;
  /** Rails not offered here — the one already proposed, on a counter. */
  exclude?: readonly PaymentRail[];
  disabled?: boolean;
  label?: string;
};

/**
 * A compact rail chooser for a dialog, where the two-card comparison would not
 * fit and is not the question being asked.
 *
 * `PaymentTermsPicker` is the client's decision — two priced options weighed
 * against each other. This is the vendor's: a single alternative, described in
 * their own terms rather than the client's, inside a confirmation they are
 * already committed to. Different question, different control; sharing one
 * component between them would mean a vendor reading about the fee they do not
 * pay.
 */
export function PaymentRailChoice({
  value,
  onChange,
  actor,
  exclude = [],
  disabled,
  label = 'How would you rather be paid?',
}: PaymentRailChoiceProps) {
  const options = PAYMENT_RAILS.filter((rail) => !exclude.includes(rail));

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={700}>
        {label}
      </Typography>

      <Stack role="radiogroup" aria-label={label} spacing={1}>
        {options.map((rail) => {
          const spec = paymentRailSpec(rail);
          const active = value === rail;
          return (
            <Box
              key={rail}
              role="radio"
              aria-checked={active}
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onChange(rail)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(rail);
                }
              }}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                border: (t) =>
                  `1.5px solid ${active ? t.palette.secondary.main : alpha(t.palette.divider, 0.9)}`,
                bgcolor: (t) => (active ? alpha(t.palette.secondary.main, 0.07) : 'transparent'),
                '&:focus-visible': {
                  outline: (t) => `2px solid ${t.palette.secondary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Radio
                  checked={active}
                  size="small"
                  disabled={disabled}
                  tabIndex={-1}
                  sx={{ p: 0.25 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={active ? 700 : 600}>
                    {railLabelFor(rail, actor)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {actor === 'vendor' ? spec.vendorNote : spec.tagline}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
