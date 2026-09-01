import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import type { QuoteComparisonModel } from '@/lib/types';
import QuoteCompareTable from '../molecules/QuoteCompareTable';
import QuoteCompareStack from '../molecules/QuoteCompareStack';

type Props = {
  open: boolean;
  rows: QuoteComparisonModel[];
  isLoading: boolean;
  error: unknown;
  acceptableIds: string[];
  onAccept: (quotationId: string) => void;
  onClose: () => void;
  onClear: () => void;
};

/**
 * Two or three quotes, side by side.
 *
 * Picks between two genuinely different layouts at `md` rather than reflowing
 * one — see `QuoteCompareStack` for why a shrunk table is not a phone design.
 * Full screen below `sm` because a comparison is the whole task while it is
 * open, not a panel over something else.
 *
 * The cross-line note is information, not a warning. Comparing a caterer
 * against a photographer is usually a mistake and occasionally the exact
 * question the client has ("can I afford both?"), so the dialog says what it
 * has noticed and leaves the judgement alone.
 */
export default function QuoteCompareDialog({
  open,
  rows,
  isLoading,
  error,
  acceptableIds,
  onAccept,
  onClose,
  onClear,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const wide = useMediaQuery(theme.breakpoints.up('md'));

  const lines = new Set(rows.map((r) => r.requirement_id ?? 'none'));
  const spansLines = lines.size > 1;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        Compare quotes
        <Typography variant="body2" color="text.secondary">
          The best value on each row is ticked. Nothing here is binding until you accept one.
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error ? (
          <Alert severity="error">
            {error instanceof Error ? error.message : 'Could not load this comparison.'}
          </Alert>
        ) : isLoading ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={72} />
            <Skeleton variant="rounded" height={220} />
          </Stack>
        ) : rows.length < 2 ? (
          <Alert severity="info">Pick at least two quotes to compare them.</Alert>
        ) : (
          <Stack spacing={2}>
            {spansLines && (
              <Alert severity="info">
                These quotes are for different parts of your event, so their totals are not
                alternatives to each other.
              </Alert>
            )}
            {wide ? (
              <QuoteCompareTable rows={rows} onAccept={onAccept} acceptableIds={acceptableIds} />
            ) : (
              <QuoteCompareStack rows={rows} onAccept={onAccept} acceptableIds={acceptableIds} />
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClear} color="inherit" variant="text">
          Clear selection
        </Button>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
