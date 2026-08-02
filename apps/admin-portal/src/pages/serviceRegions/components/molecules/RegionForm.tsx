import { Controller } from 'react-hook-form';
import { Box, Button, Divider, FormControlLabel, Stack, Switch } from '@sinnapi/ui';
import type { ServiceRegionModel } from '@/lib/types';
import { SCOPE_OPTIONS, type RegionFormValues } from '../../schema';
import { useRegionForm } from '../../hooks/useRegionForm';
import ControlledField from './ControlledField';

type Props = {
  /** The region being edited, or null when creating. */
  region: ServiceRegionModel | null;
  isCreate: boolean;
  /** Suggested sort order for a new region — one past the current highest. */
  nextSortOrder: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: RegionFormValues) => Promise<boolean>;
};

/**
 * The editable region fields. Scrolls independently of the pinned action bar
 * so the save button is always reachable. Drives both create and edit — the
 * only difference is the button copy and the initial values.
 */
export default function RegionForm({
  region,
  isCreate,
  nextSortOrder,
  busy,
  onCancel,
  onSave,
}: Props) {
  const { control, isDirty, submit } = useRegionForm(region, nextSortOrder, onSave);

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          <ControlledField name="name" control={control} label="Region name" required autoFocus />
          <ControlledField
            name="key"
            control={control}
            label="Key"
            disabled
            helperText={
              isCreate
                ? 'Auto-generated from the name — lowercase, no spaces.'
                : 'Fixed once created — vendor search and the public site key off it.'
            }
          />
          <ControlledField
            name="scope"
            control={control}
            label="Scope"
            options={SCOPE_OPTIONS}
            helperText="How broad this region is — a city, a country, a continent, etc."
          />
          <ControlledField
            name="sort_order"
            control={control}
            label="Sort order"
            helperText="Lower shows first. Prefilled with the next open position — change it to reorder."
          />

          <Divider />
          <Controller
            name="is_active"
            control={control}
            render={({ field: { value, ...field } }) => (
              <FormControlLabel
                control={<Switch {...field} checked={value} />}
                label="Active (selectable by vendors)"
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
          {busy ? 'Saving…' : isCreate ? 'Create region' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  );
}
