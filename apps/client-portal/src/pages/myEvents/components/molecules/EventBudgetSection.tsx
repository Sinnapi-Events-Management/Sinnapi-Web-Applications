import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@sinnapi/ui';
import type { EventBudgetValues } from '../../schema';
import EventBudgetFields from './EventBudgetFields';

type Props = {
  control: Control<EventBudgetValues>;
  disabled?: boolean;
};

/**
 * The budget block inside the payment-terms dialog: a heading that says what
 * the figure is for, and the fields.
 *
 * Sits on its own faintly raised panel because it is the input half of a dialog
 * whose other half is output — the client types here and reads the priced
 * comparison below. Colours come from the theme's own surface tokens, so the
 * panel is a shade lighter than the dialog in light mode and a shade lighter in
 * dark mode too, with no hardcoded value to go wrong in either.
 */
export default function EventBudgetSection({ control, disabled }: Props) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" fontWeight={700}>
          What you expect to spend
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vendors see this on your event, and we use it to price the options below. You can change
          it whenever your plans do.
        </Typography>
      </Stack>

      <EventBudgetFields
        control={control}
        disabled={disabled}
        helperText="The payment options below are priced against this figure."
      />
    </Stack>
  );
}
