import { Alert, Button, Typography } from '@sinnapi/ui';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import UndoIcon from '@mui/icons-material/Undo';
import {
  OutcomeActions,
  OutcomeCard,
  OutcomeHeader,
  OutcomeLayout,
  PaymentFactsPanel,
} from '@sinnapi/ui/payments';
import type { PaymentReturnModel } from '@/lib/types';
import { usePaymentFacts } from '../../hooks/usePaymentFacts';
import { useSubscriptionOutcome } from '../../hooks/useSubscriptionOutcome';
import type { ReturnState } from '../../hooks/usePaymentReturn';

type Props = {
  state: Exclude<ReturnState, 'invalid' | 'loading' | 'not_found'>;
  payment: PaymentReturnModel;
  email: string | null;
  onCheckAgain: () => void;
  isChecking: boolean;
};

/**
 * A subscription payment that came back to the client portal.
 *
 * Subscriptions are paid from the vendor portal and normally return there;
 * this card exists so a vendor sent here by a default callback URL is told the
 * truth about their payment rather than shown an escrow breakdown with nothing
 * in it. It says what happened and, when the vendor portal's origin is
 * configured, where to go next. It never offers a second payment.
 */
export default function SubscriptionOutcomeCard({
  state,
  payment,
  email,
  onCheckAgain,
  isChecking,
}: Props) {
  const facts = usePaymentFacts({ payment, bookingRef: null });
  const { accent, title, description, notice, manageHref, waiting } = useSubscriptionOutcome({
    state,
    payment,
    email,
  });

  return (
    <OutcomeLayout
      header={
        <OutcomeHeader
          accent={accent}
          markVariant={state === 'confirmed' ? 'check' : 'glyph'}
          markIcon={
            state === 'failed' ? (
              <ErrorOutlineIcon />
            ) : state === 'cancelled' ? (
              <UndoIcon />
            ) : (
              <HourglassTopIcon />
            )
          }
          pulse={waiting}
          title={title}
          description={description}
        />
      }
      aside={<PaymentFactsPanel facts={facts} />}
    >
      <OutcomeCard accent={accent}>
        {notice && <Alert severity={notice.severity}>{notice.text}</Alert>}

        <Typography variant="body2" color="text.secondary">
          Your subscription is managed from the vendor portal.
        </Typography>

        <OutcomeActions>
          {manageHref && (
            <Button href={manageHref} variant="contained" size="large">
              Open vendor portal
            </Button>
          )}
          {state === 'processing' && (
            <Button onClick={onCheckAgain} variant="outlined" size="large" disabled={isChecking}>
              {isChecking ? 'Checking…' : 'Check again'}
            </Button>
          )}
        </OutcomeActions>
      </OutcomeCard>
    </OutcomeLayout>
  );
}
