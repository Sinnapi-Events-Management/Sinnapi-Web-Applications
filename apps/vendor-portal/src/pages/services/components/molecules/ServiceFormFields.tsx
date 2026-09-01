import type { Control } from 'react-hook-form';
import { Stack } from '@sinnapi/ui';
import { ControlledField, type SelectOption } from '@sinnapi/ui/forms';
import ServiceCategoryField from './ServiceCategoryField';
import ServicePricingModelsField from './ServicePricingModelsField';
import ServiceVisibilityField from './ServiceVisibilityField';
import type { ServiceFormValues } from '../../schema';

type Props = {
  control: Control<ServiceFormValues>;
  categoryOptions: SelectOption[];
  categoriesLoading: boolean;
  hasNoCategories: boolean;
};

/**
 * What the vendor fills in to describe one service.
 *
 * Layout only — no submit, no write, no query, and no field logic either: each
 * control below owns its own binding, so this component is the ORDER of the
 * questions and nothing else. That order is the order they matter in: what it
 * is, where it is filed, how you are paid for it, and whether anyone can see
 * it yet.
 *
 * The same list serves the new-service dialog and the editor. A separate edit
 * form is how the two drift until one of them is missing a field.
 *
 * THERE IS NO PRICE FIELD
 * Deliberately. A service is what the vendor does; a package is what it costs.
 * The helper text on the pricing models says where the price actually lives,
 * because a vendor who came looking for the price box needs an answer, not an
 * absence.
 */
export default function ServiceFormFields({
  control,
  categoryOptions,
  categoriesLoading,
  hasNoCategories,
}: Props) {
  return (
    <Stack spacing={3}>
      <Stack spacing={2}>
        <ControlledField
          name="title"
          control={control}
          label="Service title"
          placeholder="Wedding photography"
          autoFocus
        />
        <ControlledField
          name="description"
          control={control}
          label="Description"
          placeholder="What this covers, and who it is for."
          multiline
          minRows={3}
        />
        <ServiceCategoryField
          control={control}
          options={categoryOptions}
          loading={categoriesLoading}
          unavailable={hasNoCategories}
        />
      </Stack>

      <ServicePricingModelsField control={control} />
      <ServiceVisibilityField control={control} />
    </Stack>
  );
}
