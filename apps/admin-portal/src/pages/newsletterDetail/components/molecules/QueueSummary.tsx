import { Alert, AlertTitle, Stack, Chip } from '@sinnapi/ui';
import type { NewsletterQueueResult } from '@/lib/types';

type Props = { result: NewsletterQueueResult };

/**
 * What actually got queued, and what did not.
 *
 * Shown between "confirm audience" and "send" precisely so the exclusions are
 * read while they can still change the decision. A tool that reports 412 queued
 * without mentioning the 38 it dropped is one where nobody ever notices the
 * suppression list is doing something they did not expect.
 */
export default function QueueSummary({ result }: Props) {
  const excluded = result.skipped_suppressed + result.skipped_no_consent;

  return (
    <Alert severity={result.queued > 0 ? 'success' : 'warning'}>
      <AlertTitle>
        {result.queued.toLocaleString()} {result.queued === 1 ? 'recipient' : 'recipients'} ready
      </AlertTitle>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        {result.imported > 0 && (
          <Chip size="small" label={`${result.imported} added from your list`} />
        )}
        {result.skipped_no_consent > 0 && (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`${result.skipped_no_consent} skipped — no consent`}
          />
        )}
        {result.skipped_suppressed > 0 && (
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={`${result.skipped_suppressed} skipped — suppressed`}
          />
        )}
        {excluded === 0 && result.queued > 0 && (
          <Chip size="small" variant="outlined" label="Nobody was excluded" />
        )}
      </Stack>
    </Alert>
  );
}
