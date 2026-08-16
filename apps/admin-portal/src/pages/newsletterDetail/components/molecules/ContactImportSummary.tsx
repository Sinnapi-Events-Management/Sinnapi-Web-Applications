import { Alert, Button, Chip, Stack, Typography } from '@sinnapi/ui';
import type { ContactImportResult } from '../../hooks/useContactImport';

type Props = {
  result: ContactImportResult;
  onClear: () => void;
};

/**
 * What the parser made of the file.
 *
 * This is the only evidence an operator has that a spreadsheet was read the way
 * they expected — nobody eyeballs 400 rows — so it reports four separate facts
 * rather than one reassuring total:
 *
 *   accepted     complete name-and-address pairs
 *   duplicates   the same address more than once, merged
 *   skipped      rows that had data but no usable contact, WITH the row number
 *   columns      which headers were matched, so a mis-mapping is visible
 *
 * The last one earns its place the day somebody's file has both "Name" and
 * "Company name": the parser picks one, and this is where that choice becomes
 * something the operator can see instead of something they discover in a send.
 */
export default function ContactImportSummary({ result, onClear }: Props) {
  const accepted = result.contacts.length;

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
        {result.rejectedCount > 0 && (
          <Chip
            size="small"
            color="warning"
            label={`${result.rejectedCount.toLocaleString()} skipped`}
          />
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Read “{result.columns.name}” as the name and “{result.columns.email}” as the address.
      </Typography>

      {result.rejected.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Skipped:{' '}
          {result.rejected
            .slice(0, 6)
            .map((r) => `row ${r.row} (${r.reason.toLowerCase()})`)
            .join(', ')}
          {result.rejectedCount > 6
            ? ` and ${(result.rejectedCount - 6).toLocaleString()} more`
            : ''}
          .
        </Typography>
      )}
    </Alert>
  );
}
