import { Box, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useWatch, type Control } from 'react-hook-form';
import { BIOGRAPHY_MAX, type VendorProfileFormValues } from '../../schema';

type Props = {
  control: Control<VendorProfileFormValues>;
  disabled?: boolean;
};

/**
 * The business bio, with a live character count.
 *
 * The counter is the reason this is its own component: the field has a 2000
 * character cap, and a vendor writing a long bio should watch the budget shrink
 * rather than discover on submit that the last two paragraphs were rejected. It
 * turns amber near the limit for the same reason.
 */
export default function BiographyField({ control, disabled }: Props) {
  const value = useWatch({ control, name: 'biography' }) ?? '';
  const remaining = BIOGRAPHY_MAX - value.length;

  return (
    <Box>
      <ControlledField
        name="biography"
        control={control}
        label="Business bio"
        multiline
        minRows={5}
        disabled={disabled}
        placeholder="What you do, who you do it for, and what makes booking you different."
      />
      <Typography
        variant="caption"
        // `aria-live` on a per-keystroke counter would flood a screen reader, so
        // this is left silent: the cap is also enforced by the schema, which does
        // announce itself as a field error.
        sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
        color={remaining < 100 ? 'warning.main' : 'text.secondary'}
      >
        {remaining.toLocaleString()} characters left
      </Typography>
    </Box>
  );
}
