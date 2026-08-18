import { Alert, Box, Button, Divider, SectionCard, Stack } from '@sinnapi/ui';
import { ControlledField, useSavedForm } from '@sinnapi/ui/forms';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import {
  CURRENCY_OPTIONS,
  vendorProfileFormSchema,
  type VendorProfileFormValues,
} from '../../schema';
import BiographyField from '../molecules/BiographyField';

type Props = {
  /** Last saved values; must be referentially stable per record revision. */
  values: VendorProfileFormValues;
  busy: boolean;
  error: string | null;
  onSave: (values: VendorProfileFormValues) => Promise<boolean>;
};

/**
 * The editable business listing.
 *
 * Grouped rather than presented as one flat column: what the business *is* first,
 * where to find it second, what it costs last. A vendor filling this in for the
 * first time is answering three different questions, and the previous single stack
 * of six fields gave them no indication of that.
 */
export default function BusinessDetailsForm({ values, busy, error, onSave }: Props) {
  const { control, isDirty, revert, submit } = useSavedForm(
    vendorProfileFormSchema,
    values,
    onSave,
  );

  return (
    <SectionCard
      title="Business details"
      subtitle="This is what clients see on your public listing"
      icon={<StorefrontIcon />}
    >
      <Box component="form" onSubmit={submit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2.5}>
          <ControlledField
            name="business_name"
            control={control}
            label="Business name"
            required
            disabled={busy}
            helperText="Your trading name — this is the heading on your listing."
          />

          <BiographyField control={control} disabled={busy} />

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ControlledField
              name="base_city"
              control={control}
              label="Base city"
              disabled={busy}
              helperText="Where you work from. Set the regions you travel to under Service coverage."
            />
            <ControlledField
              name="website"
              control={control}
              label="Website"
              placeholder="https://yourbusiness.com"
              disabled={busy}
            />
          </Stack>

          <Divider />

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <ControlledField
              name="starting_price"
              control={control}
              type="number"
              label="Starting price"
              inputProps={{ min: 0 }}
              disabled={busy}
              helperText="The lowest you'll take on a booking. Shown as a “from” price, not a quote."
            />
            <ControlledField
              name="currency"
              control={control}
              label="Currency"
              options={CURRENCY_OPTIONS}
              disabled={busy}
              sx={{ width: 140, flexShrink: 0 }}
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          justifyContent="flex-end"
        >
          <Button
            onClick={revert}
            disabled={busy || !isDirty}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || !isDirty}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </Stack>
      </Box>
    </SectionCard>
  );
}
