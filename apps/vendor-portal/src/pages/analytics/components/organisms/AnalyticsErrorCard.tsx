import { Box, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

type Props = {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
};

/**
 * What replaces the page when either read fails.
 *
 * Retryable, because the overwhelmingly common cause is a dropped connection
 * and the fix is the button the vendor is already looking at — a bare error
 * alert leaves them to guess that reloading the whole page is the remedy.
 */
export default function AnalyticsErrorCard({ error, onRetry, isRetrying }: Props) {
  const message =
    error instanceof Error ? error.message : 'Something went wrong loading your analytics.';

  return (
    <SectionCard
      title="Could not load your analytics"
      subtitle="Your figures are safe — this is a problem reading them"
      icon={<ErrorOutlineIcon />}
      accent="error"
    >
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>

        <Box>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying…' : 'Try again'}
          </Button>
        </Box>
      </Stack>
    </SectionCard>
  );
}
