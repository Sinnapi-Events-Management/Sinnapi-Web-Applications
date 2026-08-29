import { useController, type Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch, Typography } from '@sinnapi/ui';
import type { ServiceFormValues } from '../../schema';

/**
 * Whether clients can see this service once it is saved.
 *
 * The caption below the switch changes with it rather than describing the
 * control in the abstract, because the two states have genuinely different
 * advice: one is a statement of fact, the other is the next thing to do. No
 * validation message — a boolean cannot be wrong.
 */
export default function ServiceVisibilityField({
  control,
}: {
  control: Control<ServiceFormValues>;
}) {
  const { field } = useController({ name: 'is_active', control });

  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Switch
            checked={field.value}
            onChange={(event) => field.onChange(event.target.checked)}
          />
        }
        label="Show this service to clients"
      />
      <Typography variant="caption" color="text.secondary">
        {field.value
          ? 'Clients browsing your profile will see this service.'
          : 'Saved as hidden — build your packages first, then switch it on.'}
      </Typography>
    </Stack>
  );
}
