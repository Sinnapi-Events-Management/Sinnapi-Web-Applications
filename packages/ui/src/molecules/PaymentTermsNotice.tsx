'use client';
import { Alert, AlertTitle, Chip, Stack, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { paymentRailSpec, type PaymentTermsView } from './paymentTerms';

export type PaymentTermsNoticeProps = {
  view: PaymentTermsView;
  /** The other party, named in the quoted note. "your vendor", "the client". */
  counterpartyLabel: string;
};

/**
 * Where the payment terms have got to, on a booking either party is looking at.
 *
 * The severity is the state, not the rail: something waiting on the reader is
 * `warning` because it is a task, an agreed off-platform booking is `warning`
 * because it is unprotected, and an agreed escrow booking is `success` because
 * it is the only combination where nothing is outstanding and the money is
 * safe. A client should be able to tell those apart without reading.
 *
 * All copy comes from `readPaymentTerms`, so the two portals cannot describe
 * one row differently.
 */
export function PaymentTermsNotice({ view, counterpartyLabel }: PaymentTermsNoticeProps) {
  const spec = view.rail ? paymentRailSpec(view.rail) : null;

  return (
    <Alert severity={severity(view)} icon={false}>
      <AlertTitle sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <span>{view.headline}</span>
          {spec && (
            <Chip
              size="small"
              variant="outlined"
              icon={spec.rail === 'escrow' ? <ShieldIcon /> : <HandshakeIcon />}
              label={spec.label}
            />
          )}
        </Stack>
      </AlertTitle>

      <Typography variant="body2">{view.detail}</Typography>

      {view.note && (
        <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }} color="text.secondary">
          “{view.note}” — {counterpartyLabel}
        </Typography>
      )}

      {view.fromEvent && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          These terms are set on the event this booking belongs to and apply to every booking under
          it.
        </Typography>
      )}
    </Alert>
  );
}

/**
 * Two things can make this row need attention — someone is waiting, or the
 * money is unprotected — and they are ranked in that order because only one of
 * them is a task.
 */
function severity(view: PaymentTermsView): 'success' | 'info' | 'warning' | 'error' {
  if (view.isWaitingOnMe) return 'warning';
  if (view.awaitingVendor || view.awaitingClient) return 'info';
  if (view.status === 'declined') return 'error';
  return view.rail === 'direct' ? 'warning' : 'success';
}
