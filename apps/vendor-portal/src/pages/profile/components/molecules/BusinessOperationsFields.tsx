import { Grid } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import { LEAD_TIME_OPTIONS, YEARS_OPTIONS } from '@/lib/vendorFieldOptions';
import type { VendorProfileFormValues } from '../../schema';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/**
 * How the business operates: where clients can visit, how long it has been going
 * and how far ahead it books.
 *
 * All three are optional during onboarding, so this is where a vendor fills in
 * whatever they skipped. Rendered straight into the panel rather than inside a
 * `Stack`: a Stack's child margin reset cancels the Grid's negative margin, which
 * is what pushed these fields past the card's edge before.
 */
export default function BusinessOperationsFields({ control, disabled }: Props) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12}>
        <ControlledField
          name="business_location"
          control={control}
          label="Location / address"
          placeholder="Street, building or landmark"
          disabled={disabled}
          helperText="Only if clients can visit you."
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <ControlledField
          name="years_in_operation"
          control={control}
          label="Years in operation"
          options={YEARS_OPTIONS}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <ControlledField
          name="lead_time"
          control={control}
          label="Typical booking lead time"
          options={LEAD_TIME_OPTIONS}
          disabled={disabled}
        />
      </Grid>
    </Grid>
  );
}
