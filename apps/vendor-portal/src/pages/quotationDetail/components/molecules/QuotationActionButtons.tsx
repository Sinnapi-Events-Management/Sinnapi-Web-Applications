import { Button, Stack } from '@sinnapi/ui';
import type { QuotationAction, QuotationActionSpec } from '@sinnapi/ui';

type Props = {
  actions: QuotationActionSpec[];
  isBusy: boolean;
  onRequest: (action: QuotationAction) => void;
};

/**
 * The action buttons for a quotation.
 *
 * Everything a vendor can do here is destructive, so nothing is rendered
 * contained: an outlined button beside a filled "Send quote" in the builder
 * keeps the constructive move the one the eye lands on.
 */
export default function QuotationActionButtons({ actions, isBusy, onRequest }: Props) {
  return (
    <Stack spacing={1.25}>
      {actions.map((spec) => (
        <Button
          key={spec.action}
          fullWidth
          variant="outlined"
          color={spec.tone}
          disabled={isBusy}
          onClick={() => onRequest(spec.action)}
        >
          {spec.label}
        </Button>
      ))}
    </Stack>
  );
}
