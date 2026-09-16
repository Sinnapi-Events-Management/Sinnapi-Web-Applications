import { Alert, Box, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useServiceCategories } from '@/hooks/queries';
import type { VendorOnboardingModel } from '../../hooks/useOnboardingStatus';
import { useStepForm } from '../../hooks/useStepForm';
import { YEARS_OPTIONS, basicsSchema, toBasicsPatch, toBasicsValues } from '../../schema/forms';
import WizardFooter from '../molecules/WizardFooter';

type Props = {
  vendorId: string;
  vendor: VendorOnboardingModel | null;
  isLast: boolean;
  onBack: () => void;
  /** Offered only to a vendor who is editing, not onboarding. */
  onCancel?: () => void;
  onDone: () => void;
};

/** Category, city and the optional particulars underneath them. */
export default function BasicsStep({ vendorId, vendor, isLast, onBack, onCancel, onDone }: Props) {
  const categories = useServiceCategories();
  const { control, submit, saving, error } = useStepForm(
    vendorId,
    basicsSchema,
    vendor,
    toBasicsValues,
    toBasicsPatch,
    onDone,
  );

  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }));

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <ControlledField
          name="primary_category_id"
          control={control}
          label="Primary category"
          options={categoryOptions}
          disabled={saving || categories.isLoading}
          required
          helperText="The one clients would search for first. You can list more services later."
        />
        <ControlledField
          name="base_city"
          control={control}
          label="Base of operation / city"
          disabled={saving}
          required
        />
        <ControlledField
          name="business_location"
          control={control}
          label="Location / address (optional)"
          disabled={saving}
          helperText="A street or landmark, if you have premises clients can visit."
        />
        <ControlledField
          name="years_in_operation"
          control={control}
          label="Years in operation (optional)"
          options={YEARS_OPTIONS}
          disabled={saving}
        />
      </Stack>

      <WizardFooter
        showBack={false}
        saving={saving}
        isLast={isLast}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
      />
    </Box>
  );
}
