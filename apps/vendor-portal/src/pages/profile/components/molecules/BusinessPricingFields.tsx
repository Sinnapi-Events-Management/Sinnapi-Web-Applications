import { Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import { CURRENCY_OPTIONS, type VendorProfileFormValues } from '../../schema';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/**
 * What the business costs: a starting price and the currency it is quoted in.
 *
 * The pair stacks below `sm` rather than staying a row at every width. Side by
 * side, a number field and a fixed 140px select leave the amount too narrow to
 * read on a phone — and these two are only ever entered together, so a column
 * costs nothing in comprehension.
 */
export default function BusinessPricingFields({ control, disabled }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
      <ControlledField
        name="starting_price"
        control={control}
        type="number"
        label="Starting price"
        inputProps={{ min: 0 }}
        disabled={disabled}
        helperText="The lowest you'll take on a booking. Shown as a “from” price, not a quote."
      />
      <ControlledField
        name="currency"
        control={control}
        label="Currency"
        options={CURRENCY_OPTIONS}
        disabled={disabled}
        sx={{ width: { xs: '100%', sm: 140 }, flexShrink: 0 }}
      />
    </Stack>
  );
}
