import type { Control } from 'react-hook-form';
import { Box, Stack, Typography } from '@sinnapi/ui';
import { ControlledField, ControlledCheckbox } from '@sinnapi/ui/forms';
import type { PackageFormValues } from '../../schema';

/**
 * The last two answers: anything else worth saying, and whether this is still
 * on sale.
 *
 * The archive switch is deliberately the final control rather than a header
 * action. Turning it off is the one thing in this dialog that changes what
 * clients can see, and a vendor should arrive at it having just read back
 * everything it applies to.
 */
export default function PackagePublishFields({ control }: { control: Control<PackageFormValues> }) {
  return (
    <Stack spacing={2}>
      <ControlledField
        name="notes"
        control={control}
        label="Notes (optional)"
        placeholder="Anything else a client should know before asking for this."
        multiline
        minRows={2}
      />
      <ControlledCheckbox
        name="is_active"
        control={control}
        label={
          <Box>
            <Typography variant="body2">Still selling this package</Typography>
            <Typography variant="caption" color="text.secondary">
              Turn this off to archive it. It stays on the quotes already built from it and leaves
              your public profile.
            </Typography>
          </Box>
        }
      />
    </Stack>
  );
}
