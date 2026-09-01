import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Typography,
  formatAmount,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import type { BudgetCheckModel, EventVendorModel } from '@/lib/types';
import BudgetImpactPreview from '../molecules/BudgetImpactPreview';

type Props = {
  open: boolean;
  target: EventVendorModel | null;
  impact: BudgetCheckModel | null;
  checking: boolean;
  busy: boolean;
  error: string | null;
  trimmableAmount: number;
  trimmableCount: number;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Confirming a price, with what it does to the budget.
 *
 * THE BUTTON CHANGES WORDS WHEN THE ANSWER CHANGES. Within budget it reads
 * "Accept this quote"; over it reads "Accept anyway" — because those are two
 * different decisions and a client who is about to overspend should have to
 * press a button that says so. This is the entire visible surface of
 * `p_acknowledge_over_budget`, and it is why that parameter is not defaulted to
 * true anywhere in the client.
 *
 * The confirm button is NOT disabled when over budget. The guard exists so
 * nobody commits without seeing the number, not to overrule a client about
 * their own money — a disabled button here would be the platform deciding, and
 * would send them to edit their budget just to get past it.
 */
export default function AcceptQuoteDialog({
  open,
  target,
  impact,
  checking,
  busy,
  error,
  trimmableAmount,
  trimmableCount,
  onConfirm,
  onClose,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isOver = Boolean(impact?.would_exceed);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ pb: 1 }}>
        Accept this price?
        {target && (
          <Typography variant="body2" color="text.secondary">
            {target.business_name} ·{' '}
            {formatAmount(target.quotation_total, target.quotation_currency ?? undefined)}
            {target.requirement_title ? ` · ${target.requirement_title}` : ''}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity={isOver ? 'warning' : 'error'} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Accepting binds this price. You will then pick a date, and the vendor confirms it.
        </Typography>

        {checking ? (
          <Skeleton variant="rounded" height={140} />
        ) : impact ? (
          <BudgetImpactPreview
            impact={impact}
            trimmableAmount={trimmableAmount}
            trimmableCount={trimmableCount}
            quoteCurrency={target?.quotation_currency}
          />
        ) : (
          // The check failed but the accept is still allowed to proceed — the
          // RPC enforces the rule either way. Saying so is better than an
          // empty panel that looks like a bug.
          <Alert severity="info">
            We could not work out the budget impact just now. You can still accept — we will check
            again as it goes through.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit" variant="text">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy || checking}
          variant="contained"
          color={isOver ? 'warning' : 'primary'}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? 'Accepting…' : isOver ? 'Accept anyway' : 'Accept this quote'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
