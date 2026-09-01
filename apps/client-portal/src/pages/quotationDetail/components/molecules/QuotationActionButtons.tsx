import { Button, Stack } from '@sinnapi/ui';
import type { QuotationAction, QuotationActionSpec } from '@sinnapi/ui';

type Props = {
  actions: QuotationActionSpec[];
  isBusy: boolean;
  onRequest: (action: QuotationAction) => void;
};

/**
 * The action buttons for a quotation, laid out with the first spec as the
 * primary and the rest as outlines.
 *
 * Order comes from `QUOTATION_ACTIONS`, which puts the constructive move first.
 * That is deliberate: Accept and Void sit side by side in the same bar, and the
 * destructive one should never be the button the thumb lands on.
 *
 * Full-width and stacked on a phone, a row from `sm` up. These now sit in a bar
 * pinned above the tabs rather than in a narrow side column, so a row is what
 * the space actually is. On a phone the stack survives, because a thumb wants
 * the target the width of the screen — and because stacking keeps Accept a
 * clear row away from Decline rather than a few pixels to its left.
 */
export default function QuotationActionButtons({ actions, isBusy, onRequest }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      useFlexGap
      flexWrap="wrap"
      sx={{ minWidth: 0 }}
    >
      {actions.map((spec, i) => (
        <Button
          key={spec.action}
          variant={i === 0 ? 'contained' : 'outlined'}
          color={i === 0 ? spec.tone : 'inherit'}
          disableElevation
          disabled={isBusy}
          onClick={() => onRequest(spec.action)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {spec.label}
        </Button>
      ))}
    </Stack>
  );
}
