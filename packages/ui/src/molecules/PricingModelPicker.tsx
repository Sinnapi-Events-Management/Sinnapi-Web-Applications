'use client';
import { useId } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import {
  PRICING_MODELS,
  pricingModelSpec,
  toPricingModels,
  type PricingModel,
} from './pricingModels';

export type PricingModelPickerProps = {
  /** The models currently chosen — `vendor_services.pricing_models`. */
  value: readonly string[] | null | undefined;
  onChange: (models: PricingModel[]) => void;
  /** Restricts the offer. Defaults to every model. */
  options?: readonly PricingModel[];
  label?: string;
  helperText?: string;
  /** A validation message. Replaces `helperText` and colours the group. */
  error?: string | null;
  disabled?: boolean;
};

/**
 * Which ways a vendor will be paid for one kind of work.
 *
 * Cards rather than checkboxes because the choice is not obvious from the
 * label alone. "Combination" means nothing to a vendor who has only ever
 * quoted a flat fee, and a row of bare checkboxes is how you get every vendor
 * ticking `fixed` and moving on. Each option carries the one line that says
 * when it is the right answer.
 *
 * Multi-select, and that is the whole point of the control: a photographer
 * takes fixed-price weddings AND hourly corporate work. Forcing one would make
 * the vendor publish a service that is a lie about half their business.
 *
 * The cards are `<button>`s in a grid that collapses to one column on a phone,
 * with `aria-pressed` carrying the state — a div with an onClick would be
 * unreachable by keyboard, and this is a required field.
 */
export function PricingModelPicker({
  value,
  onChange,
  options = PRICING_MODELS,
  label = 'How you charge for this',
  helperText,
  error,
  disabled = false,
}: PricingModelPickerProps) {
  // A generated id, not a constant: the packages editor and the services
  // form can both be mounted at once, and two groups sharing a label id make
  // a screen reader announce the wrong one.
  const labelId = useId();
  const selected = toPricingModels(value);

  const toggle = (model: PricingModel) => {
    const next = selected.includes(model)
      ? selected.filter((entry) => entry !== model)
      : [...selected, model];
    // Re-ordered through `toPricingModels` so the stored array is always in
    // presentation order. Without it the set reads back in click order, and
    // the same two models render in a different sequence on every card.
    onChange(toPricingModels(next));
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} component="span" id={labelId}>
        {label}
      </Typography>

      <Box
        role="group"
        aria-labelledby={labelId}
        sx={{
          mt: 1,
          display: 'grid',
          // One column on a phone, two from the smallest tablet up. Two is the
          // ceiling on purpose: the taglines are full sentences and a third
          // column turns each of them into four wrapped lines.
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        {options.map((model) => {
          const spec = pricingModelSpec(model);
          const isOn = selected.includes(model);

          return (
            <Box
              key={model}
              component="button"
              type="button"
              disabled={disabled}
              aria-pressed={isOn}
              onClick={() => toggle(model)}
              sx={{
                textAlign: 'left',
                cursor: disabled ? 'default' : 'pointer',
                font: 'inherit',
                color: 'inherit',
                p: 1.75,
                borderRadius: 2,
                // Every colour goes through the palette rather than a literal,
                // so the card is legible on the warm dark canvas and on the
                // light one without a second definition.
                border: (t) =>
                  `1px solid ${isOn ? t.palette.primary.main : alpha(t.palette.text.primary, 0.16)}`,
                bgcolor: (t) =>
                  isOn
                    ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.16 : 0.08)
                    : 'transparent',
                opacity: disabled ? 0.6 : 1,
                transition: (t) =>
                  t.transitions.create(['background-color', 'border-color'], { duration: 150 }),
                '&:hover': {
                  borderColor: (t) => (disabled ? undefined : t.palette.primary.main),
                },
                '&:focus-visible': {
                  outline: (t) => `2px solid ${t.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
                  {spec.label}
                </Typography>
                {isOn && <CheckRoundedIcon fontSize="small" color="primary" />}
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                {spec.tagline}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.75 }}
              >
                {spec.vendorNote}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {(error || helperText) && (
        <FormHelperText error={!!error} sx={{ mt: 1, mx: 0 }}>
          {error || helperText}
        </FormHelperText>
      )}
    </Box>
  );
}
