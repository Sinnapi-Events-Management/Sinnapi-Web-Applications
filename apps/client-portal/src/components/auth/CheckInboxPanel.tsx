import { Alert, Box, Button, IconBadge, Link, Stack, Typography } from '@sinnapi/ui';
import { CaptchaField } from '@sinnapi/ui/forms';
import { AppLink } from '@sinnapi/ui/router';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import { CONFIRM_LINK_EXPIRY_HOURS } from '@/auth/signUpApi';
import { TURNSTILE_SITE_KEY } from '@/lib/captcha';
import { useResendConfirmation } from './hooks/useResendConfirmation';

type Props = {
  /** The address the confirmation was sent to. */
  email: string;
  /** Return to the empty form so a mistyped address can be corrected. */
  onUseDifferentEmail: () => void;
};

/**
 * The screen a new client lands on after registering: their account exists but
 * is `pending`, and nothing in the portal opens until they follow the link.
 *
 * Built to the conventions this screen is judged by, because it is the one
 * moment a signup most often dies:
 *
 *   * The address is echoed back verbatim. A typo is the single most common
 *     reason the email "never arrives", and it is invisible unless shown.
 *   * The spam folder is named. It is the second most common reason.
 *   * The expiry is stated up front rather than discovered on a dead link.
 *   * Resend is always offered, with the wait rendered as a countdown so the
 *     button explains itself instead of failing.
 *   * "Use a different address" exists, because for a typo, resending to the
 *     same wrong inbox forever is the only thing the screen would otherwise do.
 *
 * Deliberately not auto-polling for confirmation: the link opens in whatever
 * browser the mail client hands it to, which is frequently not this tab, so a
 * spinner promising to advance on its own would often lie.
 */
export default function CheckInboxPanel({ email, onUseDifferentEmail }: Props) {
  const { secondsLeft, sending, notice, error, resend, captcha, canResend } =
    useResendConfirmation(email);
  const waiting = secondsLeft > 0;

  return (
    <Stack spacing={2.5} sx={{ textAlign: 'center' }}>
      {/* Shared badge rather than a hand-rolled circle: its tint is composed
          with `alpha()` off `secondary.main`, so it reads as a soft gold wash on
          both the light and the warm dark canvas — the previous fixed
          `secondary.lightest` fill would have been near-white in dark mode. */}
      <Box aria-hidden sx={{ mx: 'auto' }}>
        <IconBadge accent="secondary" circular size={72} iconSize={36}>
          <MarkEmailUnreadOutlinedIcon />
        </IconBadge>
      </Box>

      {/* No heading here: `SignUp` swaps AuthLayout's title to "Check your
          inbox" when this panel is showing, so repeating it would give the
          screen two competing h1s. */}
      <Typography color="text.secondary">
        We&rsquo;ve sent a confirmation link to{' '}
        <Box component="strong" sx={{ color: 'text.primary', wordBreak: 'break-word' }}>
          {email}
        </Box>
        . Follow it to activate your account — it expires in {CONFIRM_LINK_EXPIRY_HOURS} hours and
        works once.
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Nothing yet? It can take a minute. Check your spam or junk folder before resending.
      </Typography>

      {/* aria-live so a screen reader announces the outcome of pressing Resend,
          which otherwise changes nothing it would notice. */}
      <Box aria-live="polite">
        {notice && <Alert severity="success">{notice}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
      </Box>

      <CaptchaField {...captcha.fieldProps} siteKey={TURNSTILE_SITE_KEY} action="client-resend" />

      <Button variant="outlined" size="large" onClick={() => void resend()} disabled={!canResend}>
        {sending ? 'Sending…' : waiting ? `Resend in ${secondsLeft}s` : 'Resend confirmation email'}
      </Button>

      <Typography variant="body2" color="text.secondary">
        Wrong address?{' '}
        <Link
          component="button"
          type="button"
          onClick={onUseDifferentEmail}
          sx={{ fontWeight: 600 }}
        >
          Use a different email
        </Link>
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Already confirmed? <AppLink to="/sign-in">Sign in</AppLink>
      </Typography>
    </Stack>
  );
}
