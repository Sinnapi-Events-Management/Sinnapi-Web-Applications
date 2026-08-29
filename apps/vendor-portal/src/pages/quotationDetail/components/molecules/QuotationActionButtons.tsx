import type { ReactNode } from 'react';
import { Button, Stack } from '@sinnapi/ui';
import type { QuotationAction, QuotationActionSpec } from '@sinnapi/ui';

type Props = {
  actions: QuotationActionSpec[];
  isBusy: boolean;
  onRequest: (action: QuotationAction) => void;
  /**
   * Controls that belong in this row but are not state transitions — messaging
   * the client. A slot rather than a second `<Stack>` beside this one, because
   * the responsive rule below (full-width on a phone, a row from `sm`) has to
   * apply to every button in the bar or the odd one out looks like a mistake.
   */
  trailing?: ReactNode;
};

/**
 * The action buttons for a quotation.
 *
 * Everything the vendor can do to the quote's *state* here is destructive, so
 * none of it is rendered contained: an outlined button beside a filled "Send
 * quote" in the builder keeps the constructive move the one the eye lands on.
 * The same restraint is why "Message client" arrives outlined too — it is the
 * safe option in a row of unsafe ones, and dressing it up would make the safe
 * one the loudest thing in a bar whose subject is withdrawal.
 *
 * Full-width and stacked on a phone, a row from `sm` up. These sit in a bar
 * pinned above the tabs rather than in a narrow side column, so a row is what
 * the space actually is — a column of full-width buttons across a desktop card
 * would read as separate decisions rather than a set. On a phone the stack
 * survives, because a thumb wants the target the width of the screen.
 */
export default function QuotationActionButtons({ actions, isBusy, onRequest, trailing }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      useFlexGap
      flexWrap="wrap"
      sx={{ minWidth: 0, '& > *': { width: { xs: '100%', sm: 'auto' } } }}
    >
      {actions.map((spec) => (
        <Button
          key={spec.action}
          variant="outlined"
          color={spec.tone}
          disabled={isBusy}
          onClick={() => onRequest(spec.action)}
        >
          {spec.label}
        </Button>
      ))}

      {trailing}
    </Stack>
  );
}
