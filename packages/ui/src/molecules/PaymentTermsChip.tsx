'use client';
import { Chip, Tooltip } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { isPaymentRail, paymentRailSpec } from './paymentTerms';

export type PaymentTermsChipProps = {
  /** `bookings.payment_type`. */
  rail: string | null | undefined;
  /** `bookings.payment_terms_status`, which decides whether it is settled. */
  status?: string | null;
  size?: 'small' | 'medium';
};

/**
 * How a booking is being paid, in one chip, for a table row.
 *
 * Two facts, not one. "Escrow" on a booking the vendor has not agreed to is a
 * different statement from "escrow" on one they have, and a list that showed
 * only the rail would tell a client their money is protected before anybody had
 * said so. The chip is outlined until the terms are accepted and filled
 * afterwards, so a column of them reads as settled-or-not at a glance.
 *
 * All three portals render this: the client scanning their bookings, the vendor
 * looking for the request that needs answering, and the console adjudicating a
 * complaint. One component, because a chip that meant something slightly
 * different in each of them is worse than no chip.
 */
export function PaymentTermsChip({ rail, status, size = 'small' }: PaymentTermsChipProps) {
  if (!isPaymentRail(rail)) {
    return (
      <Tooltip title="No payment terms were proposed on this booking.">
        <Chip size={size} variant="outlined" icon={<HelpOutlineIcon />} label="Not set" />
      </Tooltip>
    );
  }

  const spec = paymentRailSpec(rail);
  const isEscrow = rail === 'escrow';
  const isAgreed = status === 'accepted';
  const isCountered = status === 'countered';

  return (
    <Tooltip title={tooltip(spec.label, status)}>
      <Chip
        size={size}
        variant={isAgreed ? 'filled' : 'outlined'}
        // Gold is reserved for the settled protected rail. Everything else is
        // neutral: an agreed off-platform booking is not a success state, and a
        // proposed escrow booking is not yet one.
        color={isAgreed && isEscrow ? 'secondary' : isCountered ? 'warning' : 'default'}
        icon={isEscrow ? <ShieldIcon /> : <HandshakeIcon />}
        label={isEscrow ? 'Sinnapi escrow' : 'Off platform'}
      />
    </Tooltip>
  );
}

function tooltip(label: string, status: string | null | undefined): string {
  switch (status) {
    case 'accepted':
      return `${label} — agreed by both parties`;
    case 'countered':
      return `${label} — the vendor has proposed different terms`;
    case 'declined':
      return `${label} — never agreed`;
    default:
      return `${label} — proposed, not yet answered`;
  }
}
