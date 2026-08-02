import { Stack, Button, Alert, Snackbar } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { CURRENCY_OPTIONS, type VendorProfileSource } from './schema';
import { useVendorProfileForm } from './hooks/useVendorProfileForm';

type Props = { vendor: VendorProfileSource & { id: string } };

// NOTE: editing sensitive fields (banking, ID) triggers re-verification server-side.
export default function VendorProfileForm({ vendor }: Props) {
  const { control, error, busy, isDirty, toast, dismissToast, submit } =
    useVendorProfileForm(vendor);

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 560 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField name="business_name" control={control} label="Business name" />
      <ControlledField name="base_city" control={control} label="Base city" />
      <ControlledField name="website" control={control} label="Website" />
      <ControlledField
        name="biography"
        control={control}
        label="Business bio"
        multiline
        minRows={4}
      />
      <Stack direction="row" spacing={2}>
        <ControlledField
          name="starting_price"
          control={control}
          type="number"
          label="Starting price"
          inputProps={{ min: 0 }}
        />
        <ControlledField
          name="currency"
          control={control}
          label="Currency"
          options={CURRENCY_OPTIONS}
          sx={{ width: 140 }}
        />
      </Stack>
      <Button
        type="submit"
        variant="contained"
        disabled={busy || !isDirty}
        sx={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Saving…' : 'Save changes'}
      </Button>
      <Snackbar
        open={toast}
        autoHideDuration={3000}
        onClose={dismissToast}
        message="Profile updated"
      />
    </Stack>
  );
}
