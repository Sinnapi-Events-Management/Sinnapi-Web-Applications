import {
  Alert,
  Checkbox,
  Divider,
  FormControlLabel,
  SectionCard,
  Stack,
  Typography,
} from '@sinnapi/ui';
import type { AudienceApi } from '../../hooks/useCampaignAudience';
import { useEmailImport } from '../../hooks/useEmailImport';
import EmailChipInput from '../molecules/EmailChipInput';
import EmailImportPanel from '../molecules/EmailImportPanel';

type Props = { api: AudienceApi; disabled?: boolean };

/**
 * Addresses that are not accounts: typed in, or uploaded from a spreadsheet.
 *
 * ── Why the attestation exists ────────────────────────────────────────────
 * These addresses have no consent record — that is what makes them useful and
 * what makes them a liability. Nothing in the platform can verify that a list
 * somebody pasted in was collected lawfully, so it does the next best thing:
 * it makes the operator state it, and stores who stated it with the campaign
 * (`attested_by`). That is not a legal shield, it is accountability: the person
 * who answers for the list is recorded before the send, not reconstructed after
 * a complaint.
 *
 * The checkbox gates the send in `useCampaignAudience.canQueue` and again in
 * `admin_newsletter_queue`, which raises `attestation_required` — so a browser
 * with the checkbox forced true still cannot queue an unattested list.
 *
 * Suppressed addresses are dropped server-side no matter what is uploaded here:
 * re-importing last year's spreadsheet is the most common way an unsubscribe
 * gets quietly undone, and it is the one thing an attestation must not buy.
 */
export default function AudienceExtras({ api, disabled }: Props) {
  const importer = useEmailImport();

  return (
    <SectionCard title="Additional addresses">
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Send to people who do not have a Sinnapi account — type addresses in, or upload a list.
        </Typography>

        <EmailChipInput
          value={api.manualEmails}
          onChange={api.setManualEmails}
          disabled={disabled}
        />

        <Divider flexItem>
          <Typography variant="caption" color="text.secondary">
            or
          </Typography>
        </Divider>

        <EmailImportPanel
          parsing={importer.parsing}
          error={importer.error}
          result={importer.result}
          disabled={disabled}
          onFile={async (file) => {
            await importer.parse(file);
          }}
          onClear={() => {
            importer.clear();
            api.setImportedEmails([]);
          }}
        />

        {/* Applying the parsed file is a separate, explicit step from parsing
            it: the operator reads the accepted/rejected counts first, and only
            then decides the file is the list they meant. */}
        {importer.result && importer.result.emails.length > 0 && (
          <FormControlLabel
            control={
              <Checkbox
                checked={api.importedEmails.length > 0}
                disabled={disabled}
                onChange={(e) =>
                  api.setImportedEmails(e.target.checked ? (importer.result?.emails ?? []) : [])
                }
              />
            }
            label={`Include the ${importer.result.emails.length} addresses from this file`}
          />
        )}

        {api.needsAttestation && (
          <Alert severity="warning" icon={false}>
            <FormControlLabel
              sx={{ alignItems: 'flex-start', m: 0 }}
              control={
                <Checkbox
                  checked={api.attested}
                  disabled={disabled}
                  onChange={(e) => api.setAttested(e.target.checked)}
                  sx={{ pt: 0.25 }}
                />
              }
              label={
                <Typography variant="body2">
                  I confirm Sinnapi holds valid consent to send marketing email to these{' '}
                  {api.extraEmails.length} addresses. This confirmation is recorded against my
                  account and the campaign. Every message still carries a one-click unsubscribe
                  link, and any address on the suppression list will be skipped automatically.
                </Typography>
              }
            />
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}
