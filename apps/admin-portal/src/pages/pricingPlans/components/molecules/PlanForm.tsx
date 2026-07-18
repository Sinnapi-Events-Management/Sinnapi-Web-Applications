import { Controller } from 'react-hook-form';
import { Box, Button, Divider, FormControlLabel, Stack, Switch } from '@sinnapi/ui';
import type { PlanModel } from '@/lib/types';
import { BILLING_CYCLE_OPTIONS, CURRENCY_OPTIONS, type PlanFormValues } from '../../schema';
import { usePlanForm } from '../../hooks/usePlanForm';
import ControlledField from './ControlledField';
import FeatureListField from './FeatureListField';

type Props = {
  /** The plan being edited, or null when creating. */
  plan: PlanModel | null;
  isCreate: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: PlanFormValues) => Promise<boolean>;
};

/**
 * The editable plan fields. Scrolls independently of the pinned action bar so
 * the save button is always reachable. Drives both create and edit — the only
 * difference is the button copy and the initial values.
 */
export default function PlanForm({ plan, isCreate, busy, onCancel, onSave }: Props) {
  const { control, features, isDirty, submit } = usePlanForm(plan, onSave);

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          <ControlledField name="name" control={control} label="Plan name" required autoFocus />
          <ControlledField
            name="key"
            control={control}
            label="Key"
            required
            helperText="URL-safe slug, unique per billing cycle — e.g. professional."
          />
          <ControlledField
            name="tagline"
            control={control}
            label="Tagline"
            placeholder="One line shown under the plan name"
          />
          <ControlledField
            name="description"
            control={control}
            label="Description"
            multiline
            minRows={3}
          />

          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <ControlledField name="price" control={control} label="Price" required />
            <Box sx={{ width: 120, flexShrink: 0 }}>
              <ControlledField
                name="currency"
                control={control}
                label="Currency"
                options={CURRENCY_OPTIONS}
              />
            </Box>
          </Stack>

          <ControlledField
            name="billing_cycle"
            control={control}
            label="Billing cycle"
            options={BILLING_CYCLE_OPTIONS}
          />

          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <ControlledField name="trial_days" control={control} label="Trial days" />
            <ControlledField
              name="sort_order"
              control={control}
              label="Sort order"
              helperText="Lower shows first."
            />
          </Stack>

          <Divider />
          <FeatureListField
            control={control}
            fields={features.fields}
            append={features.append}
            remove={features.remove}
          />
          <Divider />

          <Controller
            name="highlight"
            control={control}
            render={({ field: { value, ...field } }) => (
              <FormControlLabel
                control={<Switch {...field} checked={value} />}
                label="Highlight as recommended plan"
              />
            )}
          />
          <Controller
            name="is_active"
            control={control}
            render={({ field: { value, ...field } }) => (
              <FormControlLabel
                control={<Switch {...field} checked={value} />}
                label="Active (visible to vendors)"
              />
            )}
          />
        </Stack>
      </Box>

      <Divider />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy || !isDirty}>
          {busy ? 'Saving…' : isCreate ? 'Create plan' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  );
}
