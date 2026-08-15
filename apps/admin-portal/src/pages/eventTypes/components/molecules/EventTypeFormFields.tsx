import { Controller, type Control } from 'react-hook-form';
import { Divider, FormControlLabel, Stack, Switch } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { EventTypeFormValues } from '../../schema';

type Props = {
  control: Control<EventTypeFormValues>;
  /** Create mode explains that the key is being generated; edit says it's frozen. */
  isCreate: boolean;
};

/**
 * The editable event-type fields. Purely presentational — the owning form
 * supplies `control` and handles submit, so this layout can be reused by any
 * future surface (a quick-add inline in the events page, say).
 */
export default function EventTypeFormFields({ control, isCreate }: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField
        name="name"
        control={control}
        label="Event type name"
        required
        autoFocus
        helperText="What clients and vendors see — e.g. Baby Shower."
      />
      <ControlledField
        name="key"
        control={control}
        label="Key"
        disabled
        helperText={
          isCreate
            ? 'Auto-generated from the name — lowercase, no spaces.'
            : 'Fixed once created — event search and shared public-site links key off it.'
        }
      />
      <ControlledField
        name="icon"
        control={control}
        label="Icon"
        helperText="Optional icon name shown alongside the occasion in pickers."
      />
      <ControlledField
        name="sort_order"
        control={control}
        label="Sort order"
        helperText="Lower shows first, everywhere occasions are listed. Prefilled with the next open position."
      />

      <Divider />
      <Controller
        name="is_active"
        control={control}
        render={({ field: { value, ...field } }) => (
          <FormControlLabel
            control={<Switch {...field} checked={value} />}
            label="Active (selectable when posting an event)"
          />
        )}
      />
    </Stack>
  );
}
