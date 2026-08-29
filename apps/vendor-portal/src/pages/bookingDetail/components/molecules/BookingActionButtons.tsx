import { ActionNote, Button, Stack, type BookingAction, type BookingActionSpec } from '@sinnapi/ui';
import LockClockIcon from '@mui/icons-material/LockClock';

/** An action plus whether its server-side gates are currently met. */
export type GatedBookingAction = BookingActionSpec & {
  disabled: boolean;
  blockedReason: string | null;
};

type Props = {
  actions: GatedBookingAction[];
  isBusy: boolean;
  onSelect: (action: BookingAction) => void;
};

/**
 * The status writes available on this booking, as buttons.
 *
 * The first action is the filled one and the rest are outlined, so a request
 * awaiting a decision reads as a recommendation rather than a row of equal
 * choices. Destructive actions keep the error palette wherever they land in
 * that order.
 *
 * A gated action stays visible and disabled with its reason beneath the row.
 * Hiding it would be tidier and worse: the vendor knows the button exists, and
 * a panel that quietly drops it on the one day they need it reads as a fault.
 *
 * The reasons sit under the whole row rather than under their own button
 * because the row is horizontal from `sm` up: a note threaded between two
 * side-by-side buttons would either stretch the row or push its neighbour out
 * of line. Each note names its action instead.
 */
export default function BookingActionButtons({ actions, isBusy, onSelect }: Props) {
  const blocked = actions.filter((spec) => spec.disabled && spec.blockedReason);

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Stack
        // Full-width stacked buttons on a phone, a row from `sm` up. Thumbs get
        // a target the width of the screen; wider screens get the bar.
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
      >
        {actions.map((spec, i) => (
          <Button
            key={spec.action}
            variant={i === 0 ? 'contained' : 'outlined'}
            color={spec.tone === 'error' ? 'error' : spec.tone}
            disabled={isBusy || spec.disabled}
            onClick={() => onSelect(spec.action)}
          >
            {spec.label}
          </Button>
        ))}
      </Stack>

      {blocked.map((spec) => (
        <ActionNote key={spec.action} icon={<LockClockIcon />} tone="warning">
          {spec.label}: {spec.blockedReason}
        </ActionNote>
      ))}
    </Stack>
  );
}
