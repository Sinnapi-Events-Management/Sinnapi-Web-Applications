import { Controller, type Control } from 'react-hook-form';
import { Link, Stack, Typography } from '@sinnapi/ui';
import { MarketingConsent } from '@sinnapi/ui/molecules';
import { ControlledCheckbox } from '@sinnapi/ui/forms';
import { Link as RouterLink } from 'react-router-dom';
import { MARKETING_CONSENT_TEXT, type SignUpValues } from '../schema';

type Props = { control: Control<SignUpValues>; disabled?: boolean };

/**
 * The two consents on the registration form.
 *
 * They are deliberately different objects on screen, not two rows of one list.
 * Accepting the terms is a condition of having an account; the newsletter is a
 * separate, optional choice, and GDPR Art.7(2) requires that separation to be
 * visible — an opt-in presented as one more line in a block of required
 * acceptances is not "clearly distinguishable from the other matters" and is
 * not valid consent. Art.7(4) is the other half: nothing about creating an
 * account may depend on the second box, so it never blocks the submit.
 */
export default function SignUpConsent({ control, disabled }: Props) {
  return (
    <Stack spacing={2}>
      <ControlledCheckbox
        name="acceptedTerms"
        control={control}
        disabled={disabled}
        label={
          <Typography variant="body2">
            I agree to Sinnapi&apos;s{' '}
            <Link component={RouterLink} to="/terms" target="_blank">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link component={RouterLink} to="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </Typography>
        }
      />

      <Controller
        name="marketingConsent"
        control={control}
        render={({ field }) => (
          <MarketingConsent
            checked={Boolean(field.value)}
            onChange={field.onChange}
            disabled={disabled}
            label={MARKETING_CONSENT_TEXT}
            description="Ideas for your event, vendors worth knowing about, and the occasional offer. No more than twice a month."
          />
        )}
      />

      {/* A notice, not a third consent: these are service updates about the
          person's own bookings (the same ones email already carries), on by
          default by product decision, with an off switch on the profile and a
          STOP reply. */}
      <Typography variant="caption" color="text.secondary">
        We send updates about your quotes, bookings and payments by email and, once you add your
        phone number, on WhatsApp. You can turn WhatsApp updates off at any time.
      </Typography>
    </Stack>
  );
}
