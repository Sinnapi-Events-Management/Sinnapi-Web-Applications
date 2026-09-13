import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button, Typography } from '@sinnapi/ui';
import UndoIcon from '@mui/icons-material/Undo';
import { OutcomeActions, OutcomeCard, OutcomeHeader, OutcomeLayout } from '@sinnapi/ui/payments';

/**
 * The vendor cancelled checkout before the provider captured anything.
 *
 * No payment data is needed — the card just confirms what happened and
 * points back to the subscription page where the vendor can retry. Nothing to
 * itemise either, so this is the one outcome with no rail: the layout centres
 * a single column rather than leaving an empty panel beside it.
 */
export default function PaymentCancelledCard() {
  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent="warning"
          markVariant="glyph"
          markIcon={<UndoIcon />}
          title="Payment cancelled"
          description="You left the checkout before it was completed. No money was taken."
        />
      }
    >
      <OutcomeCard accent="warning">
        <Alert severity="info">Your current plan is unchanged.</Alert>
        <Typography variant="body2" color="text.secondary">
          You can try again from the subscription page, on the same payment method or a different
          one.
        </Typography>
        <OutcomeActions>
          <Button component={RouterLink} to="/subscription" variant="contained" size="large">
            Try again
          </Button>
          <Button component={RouterLink} to="/dashboard" variant="outlined" size="large">
            Go to dashboard
          </Button>
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}
