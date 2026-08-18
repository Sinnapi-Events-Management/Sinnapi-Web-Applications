import { Alert, Button, Chip, Stack, Typography } from '@sinnapi/ui';
import type { ContactImportResult } from '../../hooks/useContactImport';

type Props = {
  result: ContactImportResult;
  onClear: () => void;
};

/**
 * What the parser made of the file, in one line of counts.
 *
 * Four separate facts rather than one reassuring total:
 *
 *   accepted     complete name-and-address pairs
 *   duplicates   the same address more than once, merged
 *   skipped      rows that held data but produced no contact
 *
 * ── Why the detail moved out of here ──────────────────────────────────────
 * This used to carry a truncated sentence naming the first six skipped rows and
 * the columns that were matched. Both now have somewhere better to be: the
 * preview below lists every skipped row with its number and reason, and names
 * the columns under the table. Counts belong in the banner; evidence belongs in
 * the table, and keeping a lossy copy of the evidence up here only gives the
 * operator two versions of the same story to reconcile.
 */
export default function ContactImportSummary({ result, onClear }: Props) {
  const accepted = result.accepted.length;
  const skipped = result.rejected.length;

  return (
    <Alert
      severity={accepted ? 'success' : 'warning'}
      action={
        <Button size="small" color="inherit" onClick={onClear}>
          Remove
        </Button>
      }
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {result.fileName}
        {result.sheetName ? ` — ${result.sheetName}` : ''}
      </Typography>

      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" color="success" label={`${accepted.toLocaleString()} contacts`} />
        {result.duplicates > 0 && (
          <Chip size="small" label={`${result.duplicates.toLocaleString()} duplicates merged`} />
        )}
        {skipped > 0 && (
          <Chip size="small" color="warning" label={`${skipped.toLocaleString()} skipped`} />
        )}
      </Stack>
    </Alert>
  );
}
