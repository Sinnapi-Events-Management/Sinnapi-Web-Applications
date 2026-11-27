'use client';
import { Alert, Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { formatPhone } from './phone';

export type WhatsAppUpdatesSwitchProps = {
  /** `profiles.phone_e164` — null when the saved number has no country code. */
  phoneE164: string | null | undefined;
  /** `profiles.whatsapp_opt_out_at` is set. */
  optedOut: boolean;
  busy?: boolean;
  error?: string | null;
  /** Called with the new state. Saves straight away; not part of any form. */
  onChange: (on: boolean) => void;
};

/**
 * "WhatsApp updates" on/off, shown under the phone number on the profile page.
 *
 * It saves the moment it is flipped rather than waiting for the form's Save:
 * it is a preference, not a profile detail, and a switch that looks flipped
 * but has not taken effect is exactly the kind of setting people distrust.
 *
 * Disabled until the SAVED number is a valid international one — what counts
 * is what the database holds, not what is typed in the field above.
 */
export function WhatsAppUpdatesSwitch({
  phoneE164,
  optedOut,
  busy,
  error,
  onChange,
}: WhatsAppUpdatesSwitchProps) {
  const reachable = Boolean(phoneE164);
  const on = reachable && !optedOut;

  const hint = !reachable
    ? 'Save a phone number with its country code to get booking, quote and payment updates on WhatsApp.'
    : on
      ? `Booking, quote and payment updates go to ${formatPhone(phoneE164)} on WhatsApp. You can also reply STOP to any of them.`
      : 'Off. You still get every update by email and in the app.';

  return (
    <Box>
      <FormControlLabel
        sx={{ m: 0, alignItems: 'center' }}
        control={
          <Switch
            checked={on}
            onChange={(e) => onChange(e.target.checked)}
            disabled={!reachable || busy}
            inputProps={{ 'aria-describedby': 'whatsapp-updates-hint' }}
          />
        }
        label={
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            WhatsApp updates
          </Typography>
        }
      />
      <Typography
        id="whatsapp-updates-hint"
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', ml: 0.5, mt: 0.25 }}
      >
        {hint}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
