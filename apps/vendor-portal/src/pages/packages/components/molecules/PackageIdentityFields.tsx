import type { Control, UseFormSetValue } from 'react-hook-form';
import { Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { ServiceModel } from '@/lib/types';
import type { PackageFormValues } from '../../schema';
import PackagePricingModelField from './PackagePricingModelField';

type Props = {
  control: Control<PackageFormValues>;
  setValue: UseFormSetValue<PackageFormValues>;
  services: ServiceModel[];
  serviceOptions: { value: string; label: string }[];
};

/**
 * What the package IS, in the order a vendor answers it: what it is called,
 * what it does, what it is filed under, and how it is charged.
 *
 * These four belong together because each one narrows the next — the service
 * decides which ways of charging are on offer — and because they are the only
 * fields a vendor must answer before the preview beside them says anything at
 * all.
 */
export default function PackageIdentityFields({
  control,
  setValue,
  services,
  serviceOptions,
}: Props) {
  return (
    <Stack spacing={2}>
      <ControlledField
        name="name"
        control={control}
        label="Package name"
        placeholder="Wedding photography"
        /* Kept on the first field so a vendor can start typing on open. Safe
           because `useFieldError` will not surface a message for a field the
           user has not engaged with — a dialog's focus trap blurs an
           autofocused input a tick after mount, and that blur is the machinery
           talking, not the vendor. */
        autoFocus
      />
      <ControlledField
        name="summary"
        control={control}
        label="One-line summary"
        placeholder="Full-day coverage with a second shooter and an album."
        multiline
        minRows={2}
      />
      <ControlledField
        name="vendor_service_id"
        control={control}
        label="Service"
        options={serviceOptions}
        helperText="Groups this package under one of your listed services, and decides which ways of charging you may pick below."
      />
      {/* Below the service, because the service is what narrows it. A vendor
          who picked the model first and the service second would watch their
          answer disappear. */}
      <PackagePricingModelField
        control={control}
        services={services}
        setPricingModel={(value) => setValue('pricing_model', value, { shouldValidate: false })}
      />
    </Stack>
  );
}
