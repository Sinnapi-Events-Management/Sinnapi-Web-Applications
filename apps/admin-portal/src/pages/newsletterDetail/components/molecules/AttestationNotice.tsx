import { Alert, Checkbox, FormControlLabel, Typography } from '@sinnapi/ui';

type Props = {
  count: number;
  attested: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

/**
 * The consent attestation for addresses that carry no consent record.
 *
 * ── Why it exists ─────────────────────────────────────────────────────────
 * Typed, imported and saved-book contacts have no `marketing_subscriptions` row
 * behind them — that is what makes them useful and what makes them a liability.
 * Nothing in the platform can verify that a list somebody compiled was
 * collected lawfully, so it does the next best thing: it makes the operator
 * state it, and stores who stated it against the campaign (`attested_by`). That
 * is not a legal shield, it is accountability — the person who answers for the
 * list is recorded before the send, not reconstructed after a complaint.
 *
 * ── Why a saved book does not get a pass ──────────────────────────────────
 * Saving a list makes re-sending to it easy, which is precisely the reason the
 * attestation is asked for every time rather than inherited from the upload.
 * Consent is a fact about now, not about the day the spreadsheet was made.
 *
 * The checkbox gates the send in `useCampaignAudience.canQueue` and again in
 * `admin_newsletter_queue`, which raises `attestation_required` — so a browser
 * with the box forced true still cannot queue an unattested list.
 */
export default function AttestationNotice({ count, attested, disabled, onChange }: Props) {
  return (
    <Alert severity="warning" icon={false}>
      <FormControlLabel
        sx={{ alignItems: 'flex-start', m: 0 }}
        control={
          <Checkbox
            checked={attested}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            sx={{ pt: 0.25 }}
          />
        }
        label={
          <Typography variant="body2">
            I confirm Sinnapi holds valid consent to send marketing email to these{' '}
            {count.toLocaleString()} contacts. This confirmation is recorded against my account and
            the campaign. Every message still carries a one-click unsubscribe link, and any address
            on the suppression list will be skipped automatically.
          </Typography>
        }
      />
    </Alert>
  );
}
