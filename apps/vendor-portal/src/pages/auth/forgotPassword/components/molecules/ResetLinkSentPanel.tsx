import { Alert, AlertTitle } from '@sinnapi/ui';

/**
 * Confirmation shown after a reset request.
 *
 * Worded conditionally ("if an account exists") on purpose: the endpoint
 * answers identically for a registered and an unregistered address, so the
 * screen must not imply the address was found.
 */
export default function ResetLinkSentPanel() {
  return (
    <Alert severity="success">
      <AlertTitle>Check your inbox</AlertTitle>
      If an account exists for that email, a reset link is on its way. The link expires in 24 hours.
    </Alert>
  );
}
