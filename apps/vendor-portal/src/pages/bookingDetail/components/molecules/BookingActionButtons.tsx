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
 * A gated action stays visible and disabled with its reason beneath it. Hiding
 * it would be tidier and worse: the vendor knows the button exists, and a
 * panel that quietly drops it on the one day they need it reads as a fault.
 */
export default function BookingActionButtons({ actions, isBusy, onSelect }: Props) {
  return (
    <Stack spacing={1.5}>
      {actions.map((spec, i) => (
        <Stack key={spec.action} spacing={0.75}>
          <Button
            variant={i === 0 ? 'contained' : 'outlined'}
            color={spec.tone === 'error' ? 'error' : spec.tone}
            disabled={isBusy || spec.disabled}
            onClick={() => onSelect(spec.action)}
          >
            {spec.label}
          </Button>
          {spec.disabled && spec.blockedReason && (
            <ActionNote icon={<LockClockIcon />} tone="warning">
              {spec.blockedReason}
            </ActionNote>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
