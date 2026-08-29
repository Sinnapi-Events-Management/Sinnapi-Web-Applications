import { Button, Stack } from '@sinnapi/ui';
import type { BookingStatusSpec, BookingStatusTarget } from '../../schema/statusActions';

type Props = {
  targets: BookingStatusSpec[];
  onSelect: (status: BookingStatusTarget) => void;
  busy: boolean;
};

/**
 * The transitions this booking can be moved to, as buttons.
 *
 * The first target is the filled one and the rest are outlined, so the move an
 * operator most likely came to make reads as a recommendation rather than one
 * of a row of equal choices. Destructive targets keep the error palette
 * wherever they land in that order.
 *
 * Full-width and stacked on a phone, a row from `sm` up. These sit in a bar
 * pinned above the tabs rather than in a narrow side column, so a row is what
 * the space actually is.
 */
export default function BookingStatusButtons({ targets, onSelect, busy }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      useFlexGap
      flexWrap="wrap"
      sx={{ minWidth: 0 }}
    >
      {targets.map((spec, i) => (
        <Button
          key={spec.status}
          variant={i === 0 ? 'contained' : 'outlined'}
          color={spec.tone === 'error' ? 'error' : spec.tone}
          disableElevation
          disabled={busy}
          onClick={() => onSelect(spec.status)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {spec.label}
        </Button>
      ))}
    </Stack>
  );
}
