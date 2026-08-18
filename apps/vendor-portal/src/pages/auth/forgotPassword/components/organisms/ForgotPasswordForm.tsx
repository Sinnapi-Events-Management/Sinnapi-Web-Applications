import { Stack, Button, Alert } from '@sinnapi/ui';
import { ControlledField, CaptchaField } from '@sinnapi/ui/forms';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { useForgotPassword } from '../../hooks/useForgotPassword';
import ResetLinkSentPanel from '../molecules/ResetLinkSentPanel';

/**
 * Email + CAPTCHA, swapped for the confirmation panel once the request lands.
 * The fields are removed rather than disabled on success: there is nothing left
 * to do on this screen, and a second identical request only sends a second
 * email.
 */
export default function ForgotPasswordForm() {
  const { control, submit, error, sent, loading, captcha, canSubmit } = useForgotPassword();

  if (sent) return <ResetLinkSentPanel />;

  return (
    <Stack component="form" spacing={2.5} onSubmit={submit} noValidate>
      {error && <Alert severity="error">{error}</Alert>}
      <ControlledField
        name="email"
        control={control}
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
      />
      <CaptchaField
        {...captcha.fieldProps}
        siteKey={TURNSTILE_SITE_KEY}
        action="vendor-forgot-password"
      />
      <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button>
    </Stack>
  );
}
