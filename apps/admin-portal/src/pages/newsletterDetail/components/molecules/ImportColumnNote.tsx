import { Chip, Stack, Typography } from '@sinnapi/ui';

type Props = {
  columns: { name: string; email: string };
  ignoredColumns: string[];
};

/** How many dropped headers to name before the rest become a count. */
const SHOWN = 6;

/**
 * Which columns were read, and which were thrown away.
 *
 * A campaign only ever mails a name and an address, so every other column in
 * the file is dropped on the way in. Saying which ones out loud is what turns
 * that from data loss into a decision the operator can check: the day somebody
 * uploads a file whose real addresses live under "Work email" while a stale
 * "Email" column sits to its left, this line is where the mistake is visible —
 * before the send, not in the bounce report.
 */
export default function ImportColumnNote({ columns, ignoredColumns }: Props) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        Read “{columns.name}” as the name and “{columns.email}” as the address.
      </Typography>

      {ignoredColumns.length > 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary">
            {ignoredColumns.length.toLocaleString()} other{' '}
            {ignoredColumns.length === 1 ? 'column' : 'columns'} ignored:
          </Typography>
          {ignoredColumns.slice(0, SHOWN).map((label) => (
            <Chip
              key={label}
              size="small"
              variant="outlined"
              label={label}
              sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
            />
          ))}
          {ignoredColumns.length > SHOWN && (
            <Typography variant="caption" color="text.secondary">
              and {(ignoredColumns.length - SHOWN).toLocaleString()} more
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
