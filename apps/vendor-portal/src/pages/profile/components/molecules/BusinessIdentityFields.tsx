import { Grid } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { VendorProfileFormValues } from '../../schema';
import BiographyField from './BiographyField';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/**
 * What the business *is*: trading name, home city and bio — the top of the
 * listing. Name and city share a row from `sm` up; the bio gets the full width
 * because it is the one field people write paragraphs in.
 */
export default function BusinessIdentityFields({ control, disabled }: Props) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} sm={7}>
        <ControlledField
          name="business_name"
          control={control}
          label="Business name"
          required
          disabled={disabled}
          helperText="Your trading name — the heading on your listing."
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <ControlledField
          name="base_city"
          control={control}
          label="Base city"
          placeholder="Kampala"
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12}>
        <BiographyField control={control} disabled={disabled} />
      </Grid>
    </Grid>
  );
}
