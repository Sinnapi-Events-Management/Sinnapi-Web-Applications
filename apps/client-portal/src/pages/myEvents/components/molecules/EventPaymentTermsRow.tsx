import { useState } from 'react';
import { Button, Chip, Stack, Tooltip, isPaymentRail, paymentRailSpec } from '@sinnapi/ui';
import ShieldIcon from '@mui/icons-material/Shield';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import type { MyEventModel } from '@/lib/types';
import EventPaymentTermsDialog from '../organisms/EventPaymentTermsDialog';

type Props = { event: MyEventModel };

/**
 * The event's payment terms, and the way to change them.
 *
 * Owns its own dialog state rather than lifting it to the grid: only one card's
 * dialog is ever open, and the alternative is the grid holding an id it uses
 * for nothing else. The dialog renders only while open, so a page of twenty
 * events is not twenty mounted forms.
 *
 * "Each booking chooses" is stated rather than left blank. An event with no
 * terms set is the default and a perfectly good state, but a card that simply
 * omitted the row would leave a client unsure whether they had set something
 * and forgotten it.
 */
export default function EventPaymentTermsRow({ event }: Props) {
  const [open, setOpen] = useState(false);
  const rail = isPaymentRail(event.payment_type) ? event.payment_type : null;
  const spec = rail ? paymentRailSpec(rail) : null;

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Tooltip
          title={spec ? spec.tagline : 'Set terms once and every booking here will use them'}
        >
          <Chip
            size="small"
            variant={rail ? 'filled' : 'outlined'}
            color={rail === 'escrow' ? 'secondary' : 'default'}
            icon={
              rail === 'escrow' ? (
                <ShieldIcon />
              ) : rail === 'direct' ? (
                <HandshakeIcon />
              ) : (
                <PaymentsOutlinedIcon />
              )
            }
            label={
              rail === 'escrow'
                ? 'Sinnapi escrow'
                : rail === 'direct'
                  ? 'Off platform'
                  : 'Each booking chooses'
            }
          />
        </Tooltip>

        <Button size="small" variant="text" onClick={() => setOpen(true)}>
          {rail ? 'Change' : 'Set terms'}
        </Button>
      </Stack>

      <EventPaymentTermsDialog event={event} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
