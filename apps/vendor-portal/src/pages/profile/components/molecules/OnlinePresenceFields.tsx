import { Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import SocialLinksFields from '@/components/social/SocialLinksFields';
import type { VendorProfileFormValues } from '../../schema';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/** The business's own site, then the four social profiles two per row. */
export default function OnlinePresenceFields({ control, disabled }: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField
        name="website"
        control={control}
        label="Website"
        placeholder="https://yourbusiness.com"
        disabled={disabled}
      />
      <SocialLinksFields control={control} disabled={disabled} />
    </Stack>
  );
}
