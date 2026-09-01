import { Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { VendorProfileFormValues } from '../../schema';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/** Where to find the business: the city it works from and its own site. */
export default function BusinessReachFields({ control, disabled }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
      <ControlledField
        name="base_city"
        control={control}
        label="Base city"
        disabled={disabled}
        helperText="Where you work from. Set the regions you travel to under Service coverage."
      />
      <ControlledField
        name="website"
        control={control}
        label="Website"
        placeholder="https://yourbusiness.com"
        disabled={disabled}
      />
    </Stack>
  );
}
