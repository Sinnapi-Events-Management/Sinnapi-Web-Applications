import { Alert } from '@sinnapi/ui';

type Props = {
  /** Save failure, or null when the last write succeeded (or none has run). */
  error: string | null;
};

/**
 * A save failure, shown at the top of the form it belongs to.
 *
 * Deliberately inside the form rather than in the page's snackbar: a toast that
 * disappears after four seconds is the wrong place for the one message a vendor
 * needs while deciding what to retype, and it would also detach the failure from
 * the fields that caused it.
 */
export default function FormErrorAlert({ error }: Props) {
  if (!error) return null;
  return (
    <Alert severity="error" sx={{ mb: 2.5 }}>
      {error}
    </Alert>
  );
}
