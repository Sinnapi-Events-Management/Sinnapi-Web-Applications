import { useController, type Control } from 'react-hook-form';
import { PricingModelPicker } from '@sinnapi/ui';
import { useFieldError } from '@sinnapi/ui/forms';
import type { ServiceFormValues } from '../../schema';

/**
 * The ways this vendor is willing to be paid for this kind of work.
 *
 * Bound through `useController` rather than a `Controller` render prop so that
 * `useFieldError` — the house rule about when a field may complain — is called
 * from a component body like every other field's. The picker has no blur of
 * its own, so without that binding its message would appear only on submit
 * while every neighbouring field answered on blur.
 */
export default function ServicePricingModelsField({
  control,
}: {
  control: Control<ServiceFormValues>;
}) {
  const { field, fieldState, formState } = useController({ name: 'pricing_models', control });
  const { error, onEngage } = useFieldError(fieldState, formState);

  return (
    <PricingModelPicker
      value={field.value}
      onChange={(models) => {
        onEngage();
        field.onChange(models);
      }}
      error={error}
      helperText={
        'Pick every option you are willing to work under — you can offer more than one. ' +
        'The actual figures live on the packages you build under this service.'
      }
    />
  );
}
