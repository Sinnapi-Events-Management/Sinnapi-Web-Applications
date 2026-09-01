import { Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { VendorProfileFormValues } from '../../schema';
import BiographyField from './BiographyField';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/**
 * What the business *is*: its trading name and its bio.
 *
 * The first of the form's three groups. A vendor filling this in is answering
 * three different questions — what you are, where to find you, what you cost — and
 * the flat column of six fields this replaced gave no indication of that.
 */
export default function BusinessIdentityFields({ control, disabled }: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField
        name="business_name"
        control={control}
        label="Business name"
        required
        disabled={disabled}
        helperText="Your trading name — this is the heading on your listing."
      />
      <BiographyField control={control} disabled={disabled} />
    </Stack>
  );
}
