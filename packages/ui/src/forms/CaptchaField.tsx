'use client';
import { Turnstile } from '@marsidev/react-turnstile';
import { Box, FormHelperText, useTheme } from '@mui/material';
import type { CaptchaFieldBinding } from './useCaptcha';

export type CaptchaFieldProps = CaptchaFieldBinding & {
  /** This app's Turnstile site key — public by design. */
  siteKey: string;
  /**
   * Which form is being protected, for Cloudflare's per-action analytics.
   * Lowercase, `[a-z0-9_-]`, max 32 chars.
   */
  action?: string;
};

/**
 * Telemetry marker Cloudflare aggregates at the account level, never per user.
 * Used when a caller supplies no `action` of its own.
 */
const DEFAULT_ACTION = 'turnstile-spin-v2';

/** Status line under the widget. `solved` says nothing — silence is the success state. */
const MESSAGES: Record<string, string> = {
  pending: 'Checking your browser…',
  error: "We couldn't verify your browser. Reload the page and try again.",
  expired: 'Verification expired. Hold on while we refresh it…',
};

/**
 * The Turnstile widget as a form row.
 *
 * Purely presentational — every piece of state it renders comes from
 * `useCaptcha`, which is what lets the same component sit in a react-hook-form
 * sign-in, a plain-FormData admin sign-in, and a multi-step Next.js wizard
 * without knowing anything about any of them.
 *
 * `appearance: 'interaction-only'` is the reason there is usually nothing to
 * see here: Cloudflare solves clean traffic silently and only paints a
 * challenge when it is suspicious of the visitor. That silence is also why the
 * `pending` status line exists — the submit button is disabled until a token
 * arrives, and an unexplained disabled button reads as a broken form.
 *
 * A missing site key fails CLOSED: no widget, no token, and a submit button
 * that stays disabled. Turnstile is a security control, and a control that
 * disables itself when its configuration goes missing is not one. Every app's
 * `.env` carries the key; if this message ever appears in production, the build
 * lost `VITE_TURNSTILE_SITE_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 */
export function CaptchaField({
  siteKey,
  action = DEFAULT_ACTION,
  instanceRef,
  status,
  onSuccess,
  onError,
  onExpire,
}: CaptchaFieldProps) {
  const theme = useTheme();

  if (!siteKey) {
    return (
      <FormHelperText error>
        Human verification is unavailable, so this form cannot be submitted. Please contact support.
      </FormHelperText>
    );
  }

  const message = MESSAGES[status];

  return (
    <Box>
      <Turnstile
        ref={instanceRef}
        siteKey={siteKey}
        options={{
          action,
          appearance: 'interaction-only',
          theme: theme.palette.mode,
          size: 'flexible',
          retry: 'auto',
        }}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
      />
      {message && (
        <FormHelperText error={status === 'error'} sx={{ mx: 0 }}>
          {message}
        </FormHelperText>
      )}
    </Box>
  );
}
