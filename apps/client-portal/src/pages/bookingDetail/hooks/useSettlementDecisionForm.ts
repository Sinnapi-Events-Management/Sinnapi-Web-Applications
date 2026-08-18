import { useMemo, useRef } from 'react';
import { useZodForm } from '@sinnapi/ui/forms';
import {
  parseSettlementAmount,
  settlementDecisionSchema,
  type SettlementDecisionValues,
} from '../schema';

type Options = {
  /** What the vendor asked for — the ceiling any reduction sits under. */
  requested: number;
  onApproveFull: () => Promise<boolean>;
  onApproveReduced: (amount: number, reason: string) => Promise<boolean>;
};

/**
 * The client's decision form: which answer, how much, why, and the consent
 * that makes it binding.
 *
 * State and validation live here so the dialog is layout — the same split the
 * advance-rate control uses, and for the same reason: the rules about this
 * form are rules about money, not about presentation, and they are worth
 * reading in one place without JSX around them.
 *
 * The submit path is deliberately a single function that branches on the
 * chosen decision rather than two handlers wired to two buttons. There is one
 * decision being made; two entry points would eventually differ in what they
 * send, and the difference would be in the consent.
 */
export function useSettlementDecisionForm({ requested, onApproveFull, onApproveReduced }: Options) {
  // Read through a ref so the resolver sees the live figure without being
  // rebuilt when the request refreshes underneath the open dialog.
  const requestedRef = useRef(requested);
  requestedRef.current = requested;

  const schema = useMemo(() => settlementDecisionSchema(() => requestedRef.current), []);
  const form = useZodForm<SettlementDecisionValues>(schema, {
    defaultValues: { decision: 'full', amount: '', reason: '', consent: false },
  });

  const { watch, setValue, handleSubmit, formState } = form;
  const decision = watch('decision');
  const amount = watch('amount');
  const parsed = parseSettlementAmount(amount ?? '');

  const submit = handleSubmit(async (values) => {
    if (values.decision === 'full') {
      await onApproveFull();
      return;
    }
    const value = parseSettlementAmount(values.amount);
    if (value == null) return;
    await onApproveReduced(value, values.reason.trim());
  });

  return {
    form,
    decision,
    isReduced: decision === 'reduced',
    /**
     * What would go back to the client, live, while they type. Shown beside
     * the field because "how much am I keeping" is the question they are
     * actually answering, and subtraction in someone's head is where a
     * mistyped figure survives to the confirmation.
     */
    withheld: parsed != null && parsed < requested ? requested - parsed : null,
    setDecision: (next: 'full' | 'reduced') =>
      setValue('decision', next, { shouldValidate: formState.isSubmitted }),
    submit,
  };
}
