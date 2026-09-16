import { Grid } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import { CURRENCY_OPTIONS, PRICING_OPTIONS, type VendorProfileFormValues } from '../../schema';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/**
 * What the business costs: how it prices, and the lowest amount it takes.
 *
 * Amount and currency share a row at every width above `xs`, with the currency
 * held narrow so the amount stays readable; on a phone each gets its own line.
 */
export default function BusinessPricingFields({ control, disabled }: Props) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12}>
        <ControlledField
          name="pricing_model"
          control={control}
          label="How do you price?"
          options={PRICING_OPTIONS}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12} sm={8}>
        <ControlledField
          name="starting_price"
          control={control}
          type="number"
          label="Starting price"
          inputProps={{ min: 0 }}
          disabled={disabled}
          helperText="The lowest you’ll take on a booking."
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <ControlledField
          name="currency"
          control={control}
          label="Currency"
          options={CURRENCY_OPTIONS}
          disabled={disabled}
        />
      </Grid>
    </Grid>
  );
}
