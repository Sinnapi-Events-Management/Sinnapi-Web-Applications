import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
  formatAmount,
} from '@sinnapi/ui';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import type { PackageApprovalAction } from '../../hooks/usePackageQuoteApproval';

type Projection = {
  total: number;
  combinedSaving: number;
  clientSaves: number;
};

type Props = {
  action: PackageApprovalAction | null;
  reference: string | null;
  currency: string;
  reason: string;
  onReasonChange: (next: string) => void;
  /** EXTRA percentage points on top of what the client ordered with. */
  extraDiscount: string;
  onExtraDiscountChange: (next: string) => void;
  isSweetening: boolean;
  onSweeteningChange: (next: boolean) => void;
  isExtraValid: boolean;
  /** What the client pays at the current setting, projected. */
  projection: Projection | null;
  /** What they owe as the order stands, for the before/after line. */
  currentTotal: number | null;
  /** The discount is so deep the client would owe nothing, and could not book. */
  wouldZeroTheTotal: boolean;
  canConfirm: boolean;
  isBusy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * The confirmation step, which is where the two answers stop being symmetrical.
 *
 * APPROVING leads with the one figure that matters — what the client pays —
 * and nothing else is required. The discount control is an opt-in underneath
 * it, closed every time the dialog opens, and it asks for EXTRA percentage
 * points rather than an absolute rate.
 *
 * The absolute version was unreadable, and the reason is worth keeping: on most
 * orders the tier's own `discount_rate` is 0 and the whole of the client's
 * saving is a campaign offer, so the field said "Your discount (%)", pre-filled
 * `0`, helper "At least 0%" — directly under a summary reading "15% off". Two
 * different percentages with neither named, and a pre-filled value that had to
 * be exceeded to do anything, so the resting state looked like an unanswered
 * required field. Asking for the increment leaves one number on screen whose
 * zero means exactly what it looks like.
 *
 * DECLINING carries the reason box and requires it. The client believes they
 * have an agreement and is holding a campaign use against it; a refusal with no
 * sentence attached is the worst message this product can send.
 *
 * The copy states consequences, never "are you sure" — the same rule
 * `quotationTransitions`' specs follow, and the reason those descriptions are
 * written as what the tap will cause.
 */
export default function PackageApprovalDialog({
  action,
  reference,
  currency,
  reason,
  onReasonChange,
  extraDiscount,
  onExtraDiscountChange,
  isSweetening,
  onSweeteningChange,
  isExtraValid,
  projection,
  currentTotal,
  wouldZeroTheTotal,
  canConfirm,
  isBusy,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const isApprove = action === 'approve';
  const ref = reference ?? 'this order';

  return (
    <Dialog open={action != null} onClose={isBusy ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{isApprove ? `Approve order ${ref}?` : `Decline order ${ref}?`}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {isApprove
            ? 'This agrees the order at the price shown and confirms the date. The client is told ' +
              'immediately and can create their booking straight away — there is no further step ' +
              'on their side, so this cannot be undone from here.'
            : 'This ends the order. The client is told it will not go ahead, any discount they ' +
              'claimed is released back to your campaign, and nothing is charged. They can order ' +
              'again or ask you for a bespoke quote.'}
        </DialogContentText>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isApprove ? (
          <Stack spacing={2}>
            {/* What they are approving, stated as one figure. This is the whole
                decision; the sweetener below is an aside, and the layout says
                so. */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                The client pays
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="baseline" flexWrap="wrap">
                <Typography variant="h6" component="p">
                  {formatAmount(projection?.total ?? currentTotal ?? 0, currency)}
                </Typography>
                {/* The old figure, struck through, only once it has moved.
                    Shown as a change rather than as two numbers side by side,
                    because at zero extra there is nothing to compare. */}
                {projection != null && projection.clientSaves > 0 && currentTotal != null && (
                  <>
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{ textDecoration: 'line-through' }}
                    >
                      {formatAmount(currentTotal, currency)}
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      {formatAmount(projection.clientSaves, currency)} less than they ordered
                    </Typography>
                  </>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Opt-in, and closed on every open. Approving as ordered is the
                overwhelmingly common answer, and a number field sitting open is
                a question being asked of someone who did not have one. */}
            {!isSweetening ? (
              <Button
                size="small"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => onSweeteningChange(true)}
                disabled={isBusy}
                sx={{ alignSelf: 'flex-start' }}
              >
                Give them a bigger discount
              </Button>
            ) : (
              <Collapse in appear>
                <Stack spacing={1}>
                  {/* Asks for the INCREMENT, never the absolute rate. On most
                      orders the tier's own rate is 0 and the client's saving is
                      entirely a campaign offer, so an absolute field read "at
                      least 0%" under a card saying "15% off" — two percentages,
                      neither named. There is only one number here and it starts
                      at zero, which means "no change". */}
                  <TextField
                    label="Extra discount (%)"
                    type="number"
                    value={extraDiscount}
                    onChange={(event) => onExtraDiscountChange(event.target.value)}
                    disabled={isBusy}
                    autoFocus
                    fullWidth
                    inputProps={{ min: 0, max: 100, step: 1 }}
                    error={!isExtraValid}
                    helperText={
                      isExtraValid
                        ? 'On top of the saving they already ordered with. Leave it at 0 to approve at the price above.'
                        : 'Enter a percentage between 0 and 100.'
                    }
                  />
                  {wouldZeroTheTotal && (
                    <Alert severity="warning">
                      That leaves the client owing nothing, and a booking cannot be created for zero
                      — so they would be stuck with an approved order they cannot schedule. Lower
                      the extra discount.
                    </Alert>
                  )}
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      onExtraDiscountChange('0');
                      onSweeteningChange(false);
                    }}
                    disabled={isBusy}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Never mind — approve as ordered
                  </Button>
                </Stack>
              </Collapse>
            )}
          </Stack>
        ) : (
          <TextField
            label="Why can’t you take this on?"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            disabled={isBusy}
            fullWidth
            multiline
            minRows={3}
            required
            inputProps={{ maxLength: 500 }}
            helperText="Shared with the client and kept on the order’s record."
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={isApprove ? 'success' : 'error'}
          disabled={!canConfirm || isBusy}
        >
          {isBusy ? 'Working…' : isApprove ? 'Approve order' : 'Decline order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
