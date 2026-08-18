import { Box, Divider, Stack, Typography } from '@sinnapi/ui';
import type { ImportedRecipientsApi } from '../../hooks/useImportedRecipients';
import { useImportPreview } from '../../hooks/useImportPreview';
import ImportColumnNote from '../molecules/ImportColumnNote';
import ImportPreviewTable from '../molecules/ImportPreviewTable';
import ImportPreviewTabs from '../molecules/ImportPreviewTabs';
import ImportSkippedTable from '../molecules/ImportSkippedTable';

type Props = {
  api: ImportedRecipientsApi;
  disabled?: boolean;
};

/**
 * The uploaded spreadsheet, as this campaign read it.
 *
 * ── Why it opens by itself instead of behind a "preview" button ───────────
 * The alternative to reading these rows is trusting a number, and a number is
 * precisely what nobody can check. Every mis-mapped column, every address that
 * lost its name, every row that was quietly merged as a duplicate shows up here
 * and nowhere else — so it is on screen the moment there is something to look
 * at, in front of the tick that mails it. A file with nothing wrong costs the
 * operator one glance; a file with something wrong costs them a send.
 *
 * ── Why the rows are the two the send has, not the file's ─────────────────
 * The parser keeps a name column and an email column and drops the rest, so
 * this table has two columns. The dropped headers are named underneath rather
 * than rendered, because a column shown in a preview is a column the operator
 * reasonably expects to arrive with the mail.
 *
 * The state below it is where-am-I only — see `useImportPreview`. The ticks
 * belong to `useImportedRecipients`, because they decide who is mailed.
 */
export default function ContactImportPreview({ api, disabled }: Props) {
  const preview = useImportPreview(api.result);
  const result = api.result;

  if (!result) return null;

  const excluded = api.acceptedCount - api.selectedCount;

  return (
    <Stack spacing={1.5}>
      <Divider />

      <Box>
        <Typography variant="subtitle2">What this file will send</Typography>
        <Typography variant="caption" color="text.secondary">
          {excluded > 0
            ? `${api.selectedCount.toLocaleString()} of ${api.acceptedCount.toLocaleString()} rows ticked — ${excluded.toLocaleString()} left out.`
            : 'Untick anyone in this file who should not get this campaign.'}
        </Typography>
      </Box>

      <ImportPreviewTabs
        value={preview.tab}
        acceptedCount={preview.acceptedCount}
        skippedCount={preview.rejectedCount}
        onChange={preview.selectTab}
      />

      {preview.tab === 'accepted' ? (
        <ImportPreviewTable api={api} preview={preview} disabled={disabled} />
      ) : (
        <ImportSkippedTable preview={preview} />
      )}

      <ImportColumnNote columns={result.columns} ignoredColumns={result.ignoredColumns} />
    </Stack>
  );
}
