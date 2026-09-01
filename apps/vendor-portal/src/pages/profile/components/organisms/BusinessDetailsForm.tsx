import { Box, Divider, SectionCard, Stack } from '@sinnapi/ui';
import { SavedFormActions } from '@sinnapi/ui/forms';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import { useBusinessProfileForm } from '../../hooks/useBusinessProfileForm';
import type { VendorProfileSource } from '../../schema';
import FormErrorAlert from '../atoms/FormErrorAlert';
import BusinessIdentityFields from '../molecules/BusinessIdentityFields';
import BusinessReachFields from '../molecules/BusinessReachFields';
import BusinessPricingFields from '../molecules/BusinessPricingFields';

type Props = {
  vendorId: string;
  /** The saved record; the form tracks it so a refetch reaches the fields. */
  vendor: VendorProfileSource;
  onDone: (message: string) => void;
};

/**
 * The editable business listing.
 *
 * Grouped rather than presented as one flat column: what the business *is* first,
 * where to find it second, what it costs last. A vendor filling this in for the
 * first time is answering three different questions, and the single stack of six
 * fields this replaced gave them no indication of that. Each group is its own
 * molecule, so the dividers below are the whole of this file's layout decision.
 */
export default function BusinessDetailsForm({ vendorId, vendor, onDone }: Props) {
  const { control, isDirty, revert, submit, busy, error } = useBusinessProfileForm(
    vendorId,
    vendor,
    onDone,
  );

  return (
    <SectionCard
      title="Business details"
      subtitle="This is what clients see on your public listing"
      icon={<StorefrontIcon />}
    >
      <Box component="form" onSubmit={submit} noValidate>
        <FormErrorAlert error={error} />

        <Stack spacing={2.5} divider={<Divider />}>
          <BusinessIdentityFields control={control} disabled={busy} />
          <BusinessReachFields control={control} disabled={busy} />
          <BusinessPricingFields control={control} disabled={busy} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <SavedFormActions busy={busy} isDirty={isDirty} onRevert={revert} />
      </Box>
    </SectionCard>
  );
}
