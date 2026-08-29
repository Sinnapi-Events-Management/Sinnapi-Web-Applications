import { Alert } from '@sinnapi/ui';
import { ControlledField, type SelectOption } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { ServiceFormValues } from '../../schema';

type Props = {
  control: Control<ServiceFormValues>;
  options: SelectOption[];
  loading: boolean;
  /** The platform has no categories at all, so nothing can be filed. */
  unavailable: boolean;
};

/**
 * Where this service sits in the platform's taxonomy.
 *
 * THIS FIELD IS THE FIX THE CREATE FORM WAS MISSING
 * `vendor_services.category_id` has been `not null` since 0004 and the form
 * never rendered it, so every create failed on a constraint naming a column
 * the vendor had never been shown. It is a required select now, defaulted to
 * the vendor's own primary category, with the database defaulting the same
 * value underneath as a floor.
 *
 * The empty case is an explanation rather than an empty dropdown. A select
 * with no options is a control that looks broken; the alert says what actually
 * happened and what it costs — a service with no category never appears in
 * search — and the form's save is disabled alongside it.
 */
export default function ServiceCategoryField({ control, options, loading, unavailable }: Props) {
  if (unavailable) {
    return (
      <Alert severity="warning">
        No service categories are available yet, so this service cannot be filed. Contact support —
        every service has to sit under a category to appear in search.
      </Alert>
    );
  }

  return (
    <ControlledField
      name="category_id"
      control={control}
      label="Category"
      options={options}
      disabled={loading}
      helperText={
        loading
          ? 'Loading categories…'
          : 'Where clients find this service when they browse or search.'
      }
    />
  );
}
