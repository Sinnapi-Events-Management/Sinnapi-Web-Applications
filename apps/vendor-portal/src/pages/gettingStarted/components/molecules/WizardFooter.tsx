import { Button, CircularProgress, Stack } from '@sinnapi/ui';

type Props = {
  /** Hidden rather than removed on the first step, so the row never reflows. */
  showBack: boolean;
  /** Only an optional step offers to be skipped. */
  optional?: boolean;
  /** Blocks Continue while the step's own requirement is unmet (a photo, a region). */
  disabled?: boolean;
  /**
   * The id of the form this button submits, for a step whose footer sits OUTSIDE
   * that form. A step carrying a second, independent form (the payout step does)
   * cannot nest them — HTML has no nested forms, and the browser silently drops
   * the inner one, so its submit button ends up submitting the outer form. The
   * `form` attribute is how a button reaches its form without containing it.
   */
  formId?: string;
  saving: boolean;
  isLast: boolean;
  onBack: () => void;
  /** Leaves without saving this step. Only for a vendor who is not onboarding. */
  onCancel?: () => void;
  onSkip: () => void;
};

/**
 * Back / Cancel / Skip / Continue. The primary action is `type="submit"`, so each step's
 * own form validates before the wizard advances.
 */
export default function WizardFooter({
  showBack,
  optional,
  disabled,
  formId,
  saving,
  isLast,
  onBack,
  onCancel,
  onSkip,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      spacing={1.5}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}
    >
      <Button
        variant="text"
        onClick={onBack}
        disabled={saving}
        sx={{
          display: { xs: showBack ? 'flex' : 'none', sm: 'inline-flex' },
          visibility: showBack ? 'visible' : 'hidden',
        }}
      >
        Back
      </Button>

      <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} alignItems="stretch">
        {onCancel && (
          <Button variant="text" color="inherit" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        {optional && (
          <Button variant="text" color="inherit" onClick={onSkip} disabled={saving}>
            Skip for now
          </Button>
        )}
        <Button
          type="submit"
          form={formId}
          variant="contained"
          size="large"
          disabled={saving || disabled}
          endIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {isLast ? 'Finish setup' : 'Save and continue'}
        </Button>
      </Stack>
    </Stack>
  );
}
