import { Alert, Box, Stack } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import type { VendorOnboardingModel } from '../../hooks/useOnboardingStatus';
import { useStepForm } from '../../hooks/useStepForm';
import {
  CURRENCY_OPTIONS,
  LEAD_TIME_OPTIONS,
  PRICING_OPTIONS,
  storySchema,
  toStoryPatch,
  toStoryValues,
} from '../../schema/forms';
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

/** The bio clients read, and the "from" price they compare. */
export default function StoryStep({ vendorId, vendor, isLast, onBack, onCancel, onDone }: Props) {
  const { control, submit, saving, error } = useStepForm(
    vendorId,
    storySchema,
    vendor,
    toStoryValues,
    toStoryPatch,
    onDone,
  );

  return (
    <Box component="form" noValidate onSubmit={submit}>
      <Stack spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}

        <ControlledField
          name="biography"
          control={control}
          label="Business bio"
          multiline
          minRows={4}
          disabled={saving}
          required
          helperText="What you do, your style, and what makes you stand out."
        />

        {/* Stacked below sm: a number field beside a fixed-width select leaves the
            amount too narrow to read on a phone. */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <ControlledField
            name="starting_price"
            control={control}
            type="number"
            label="Starting price"
            inputProps={{ min: 0 }}
            disabled={saving}
            required
            helperText="Shown to clients as a “from” price, not a quote."
          />
          <ControlledField
            name="currency"
            control={control}
            label="Currency"
            options={CURRENCY_OPTIONS}
            disabled={saving}
            sx={{ width: { xs: '100%', sm: 140 }, flexShrink: 0 }}
          />
        </Stack>

        <ControlledField
          name="pricing_model"
          control={control}
          label="How do you price? (optional)"
          options={PRICING_OPTIONS}
          disabled={saving}
        />
        <ControlledField
          name="lead_time"
          control={control}
          label="Typical lead time (optional)"
          options={LEAD_TIME_OPTIONS}
          disabled={saving}
          helperText="How far ahead clients usually need to book you."
        />
      </Stack>

      <WizardFooter
        showBack
        saving={saving}
        isLast={isLast}
        onBack={onBack}
        onCancel={onCancel}
        onSkip={onDone}
      />
    </Box>
  );
}
