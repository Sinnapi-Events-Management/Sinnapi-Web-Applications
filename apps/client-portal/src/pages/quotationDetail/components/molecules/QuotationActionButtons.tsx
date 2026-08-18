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
 * That is deliberate: Accept and Void sit side by side on the same card, and
 * the destructive one should never be the button the thumb lands on.
 */
export default function QuotationActionButtons({ actions, isBusy, onRequest }: Props) {
  return (
    <Stack spacing={1.25}>
      {actions.map((spec, i) => (
        <Button
          key={spec.action}
          fullWidth
          variant={i === 0 ? 'contained' : 'outlined'}
          color={i === 0 ? spec.tone : 'inherit'}
          disableElevation
          disabled={isBusy}
          onClick={() => onRequest(spec.action)}
        >
          {spec.label}
        </Button>
      ))}
    </Stack>
  );
}
