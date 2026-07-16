import { Controller } from 'react-hook-form';
import { Box, Button, Divider, FormControlLabel, Stack, Switch } from '@sinnapi/ui';
import type { VendorDetailModel } from '@/lib/types';
import {
  CURRENCY_OPTIONS,
  PRICING_MODEL_OPTIONS,
  VISIBILITY_OPTIONS,
  YEARS_IN_OPERATION_OPTIONS,
  type VendorEditValues,
} from '../../schema';
import { useVendorEditForm } from '../../hooks/useVendorEditForm';
import ControlledField from './ControlledField';

type Props = {
  vendor: VendorDetailModel;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: VendorEditValues) => Promise<boolean>;
};

/**
 * The editable vendor fields, pre-populated from the fetched record. Scrolls
 * independently of the pinned action bar so Save is always reachable.
 */
export default function VendorEditForm({ vendor, busy, onCancel, onSave }: Props) {
  const { control, suspended, isDirty, submit } = useVendorEditForm(vendor, onSave);

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        <Stack spacing={2.5}>
          <ControlledField
            name="business_name"
            control={control}
            label="Business name"
            required
            autoFocus
          />
          <ControlledField
            name="slug"
            control={control}
            label="Slug"
            required
            helperText="Used in the vendor's public URL."
          />
          <ControlledField
            name="biography"
            control={control}
            label="Biography"
            multiline
            minRows={4}
          />
          <ControlledField name="base_city" control={control} label="Base city" />
          <ControlledField
            name="website"
            control={control}
            label="Website"
            placeholder="https://example.com"
          />
          <ControlledField
            name="years_in_operation"
            control={control}
            label="Years in operation"
            options={YEARS_IN_OPERATION_OPTIONS}
          />
          <ControlledField
            name="pricing_model"
            control={control}
            label="Pricing model"
            options={PRICING_MODEL_OPTIONS}
          />

          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <ControlledField name="starting_price" control={control} label="Starting price" />
            <Box sx={{ width: 120, flexShrink: 0 }}>
              <ControlledField
                name="starting_price_currency"
                control={control}
                label="Currency"
                options={CURRENCY_OPTIONS}
              />
            </Box>
          </Stack>

          <ControlledField
            name="visibility"
            control={control}
            label="Visibility"
            options={VISIBILITY_OPTIONS}
            disabled={suspended}
            helperText={
              suspended
                ? 'Suspended vendors are always hidden. Activate the vendor to change this.'
                : undefined
            }
          />

          <Controller
            name="is_featured"
            control={control}
            render={({ field: { value, ...field } }) => (
              <FormControlLabel
                control={<Switch {...field} checked={value} />}
                label="Featured vendor"
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
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </Stack>
    </Box>
  );
}
