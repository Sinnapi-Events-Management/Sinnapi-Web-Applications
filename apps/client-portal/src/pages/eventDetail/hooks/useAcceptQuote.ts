import { useCallback, useState } from 'react';
import { useBudgetCheck, useEventVendorMutations } from '@/hooks/queries';
import type { BudgetCheckModel, EventVendorModel } from '@/lib/types';

/**
 * Accepting a vendor's price, with the budget consequence shown first.
 *
 * THE ORDER MATTERS. The client is shown what accepting does to their budget
 * BEFORE they accept, never as an error afterwards. `event_budget_check` is
 * advisory and runs here; `respond_quotation` runs the identical check itself
 * and is what actually refuses. Two calls, one rule — see `assert_event_budget`.
 *
 * WHY THE DIALOG OPENS EVEN WHEN THE BUDGET IS FINE
 * Accepting a quote binds a price. A client is entitled to see what it costs
 * them against what they have before they are held to it, and a dialog that
 * only appears when something is wrong teaches them that its appearance IS the
 * warning — so when it finally shows up they dismiss it like the others.
 *
 * THE RACE IS REAL AND IS HANDLED
 * The check and the accept are two round trips, and a vendor's quote can land
 * between them. So a `budget_exceeded` coming back from an accept the dialog
 * had cleared is not treated as a failure: the figures are re-read, the dialog
 * stays open showing the new ones, and the client is asked again. Without this
 * the client would see a raw error for a state the screen was still claiming
 * was fine.
 */
export function useAcceptQuote(eventId: string) {
  const check = useBudgetCheck(eventId);
  const { acceptQuote } = useEventVendorMutations(eventId);

  const [target, setTarget] = useState<EventVendorModel | null>(null);
  const [impact, setImpact] = useState<BudgetCheckModel | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (row: EventVendorModel) => {
      if (!row.quotation_id) return;
      setTarget(row);
      setImpact(null);
      setError(null);
      setChecking(true);
      try {
        setImpact(
          await check({
            amount: row.quotation_total ?? 0,
            currency: row.quotation_currency ?? row.event_currency,
            requirementId: row.requirement_id,
            // This quote itself, so a state where it already counted cannot
            // price the client's own money against them twice.
            excludeQuotationId: row.quotation_id,
          }),
        );
      } catch (e) {
        // A failed check must not block the accept. The RPC enforces the rule
        // regardless, so the dialog falls back to asking without the figures
        // rather than refusing to open.
        setError(e instanceof Error ? e.message : 'Could not work out the budget impact.');
      } finally {
        setChecking(false);
      }
    },
    [check],
  );

  const close = useCallback(() => {
    setTarget(null);
    setImpact(null);
    setError(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!target?.quotation_id) return;
    setError(null);
    try {
      await acceptQuote.mutateAsync({
        quotationId: target.quotation_id,
        // Only ever true once the client has been shown an overage and pressed
        // the second button. `impact.would_exceed` is what the dialog rendered.
        acknowledgeOverBudget: Boolean(impact?.would_exceed),
      });
      close();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not accept this quote.';
      if (message.includes('budget_exceeded')) {
        // The figures moved under the dialog. Re-read them and ask again,
        // rather than reporting a refusal the client was told would not happen.
        try {
          setImpact(
            await check({
              amount: target.quotation_total ?? 0,
              currency: target.quotation_currency ?? target.event_currency,
              requirementId: target.requirement_id,
              excludeQuotationId: target.quotation_id,
            }),
          );
        } catch {
          /* keep whatever figures we had; the message below still explains */
        }
        setError(
          'Something else was committed while this was open, so this quote now takes you over budget. Check the figures and confirm again if you still want it.',
        );
        return;
      }
      setError(message);
    }
  }, [acceptQuote, check, close, impact, target]);

  return {
    target,
    impact,
    checking,
    error,
    busy: acceptQuote.isPending,
    isOpen: Boolean(target),
    request,
    confirm,
    close,
  };
}
