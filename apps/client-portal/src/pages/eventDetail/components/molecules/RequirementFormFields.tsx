import type { Control } from 'react-hook-form';
import { Stack } from '@sinnapi/ui';
import { ControlledField, type SelectOption } from '@sinnapi/ui/forms';
import type { RequirementValues } from '../../schema';

type Props = {
  control: Control<RequirementValues>;
  categoryOptions: SelectOption[];
  /** Editing an existing line: the category is fixed. See `useRequirementForm`. */
  isEdit: boolean;
  disabled?: boolean;
  currency: string;
};

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'must_have', label: 'Must have' },
  { value: 'nice_to_have', label: 'Nice to have' },
];

/**
 * The fields of one budget line. Purely presentational — `control` comes from
 * the owning form, so the dialog decides what happens on submit.
 *
 * The label is optional and says so. "Catering" needs no elaboration and most
 * lines will not get one; the field exists for the client who needs to say
 * "Catering (300 guests, halal)" and would otherwise put it in the brief where
 * no card would show it.
 *
 * Amount and priority share a row from `sm` up because they are one decision —
 * how much this is worth to me — and reading them together is how a client
 * decides which line to trim.
 */
export default function RequirementFormFields({
  control,
  categoryOptions,
  isEdit,
  disabled,
  currency,
}: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField
        name="category_id"
        control={control}
        label="What do you need?"
        options={categoryOptions}
        disabled={disabled || isEdit}
        helperText={
          isEdit
            ? 'The kind of service cannot change once quotes are attached. Add a new line instead.'
            : undefined
        }
      />

      <ControlledField
        name="title"
        control={control}
        label="Label (optional)"
        disabled={disabled}
        placeholder="Catering (300 guests, halal)"
        helperText="Only if the category alone does not say it."
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 2 }}>
        <ControlledField
          name="allocated_amount"
          control={control}
          label={`Set aside (${currency})`}
          type="number"
          disabled={disabled}
          inputProps={{ min: 0, step: 'any', inputMode: 'decimal' }}
          helperText="Leave blank if you have not decided yet."
          sx={{ flex: 1 }}
        />
        <ControlledField
          name="priority"
          control={control}
          label="Priority"
          options={PRIORITY_OPTIONS}
          disabled={disabled}
          helperText="Nice-to-haves are what we suggest trimming first."
          sx={{ flex: 1 }}
        />
      </Stack>

      <ControlledField
        name="brief"
        control={control}
        label="Brief for vendors (optional)"
        disabled={disabled}
        multiline
        minRows={3}
        helperText="Vendors invited to quote for this line see this — not the amount you set aside."
      />
    </Stack>
  );
}
