import { Button, Stack } from '@sinnapi/ui';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import type { PaymentChaseAction, PaymentChaseSpec } from '@sinnapi/ui';

const ICONS: Record<PaymentChaseAction, React.ReactNode> = {
  nudge: <NotificationsActiveIcon />,
  extend: <MoreTimeIcon />,
  cancel: <EventBusyIcon />,
};

type Props = {
  /** Already filtered to what this viewer may actually do. */
  actions: PaymentChaseSpec[];
  onSelect: (action: PaymentChaseAction) => void;
  disabled?: boolean;
};

/**
 * The buttons for chasing an unpaid booking, drawn from the specs rather than
 * written out.
 *
 * Cancelling is a text button while chasing is contained, and that is a
 * judgement rather than a style: releasing someone's date is the destructive
 * option and should not be the one the eye lands on first, but it also must not
 * be hidden behind a menu — a vendor holding a date for a client who has gone
 * quiet needs it findable.
 */
export default function PaymentChaseActions({ actions, onSelect, disabled }: Props) {
  if (!actions.length) return null;

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {actions.map((spec) => (
        <Button
          key={spec.action}
          size="small"
          variant={spec.action === 'cancel' ? 'text' : 'contained'}
          color={spec.tone}
          disableElevation
          startIcon={ICONS[spec.action]}
          onClick={() => onSelect(spec.action)}
          disabled={disabled}
        >
          {spec.label}
        </Button>
      ))}
    </Stack>
  );
}
