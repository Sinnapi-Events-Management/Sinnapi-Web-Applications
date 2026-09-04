import { Alert, Stack } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import type { PaymentExceptionModel } from '@/lib/types';
import ExceptionCard from '../molecules/ExceptionCard';

type Props = {
  /** `null` when the reader lacks the permission to see the queue at all. */
  exceptions: PaymentExceptionModel[] | null;
  canReconcile: boolean;
};

/**
 * What the reconciliation sweeps have found against this payment, open items
 * first.
 *
 * Three states, and the empty two are told apart on purpose: "none filed" is a
 * finding in itself (the books agree about this payment), where "not yours to
 * see" is a permission — and a `payments.read` holder shown an empty list would
 * take the first for the second.
 */
export default function ExceptionsSection({ exceptions, canReconcile }: Props) {
  if (exceptions === null) {
    return (
      <Alert severity="info">
        Reconciliation findings are visible to holders of the finance.read or finance.reconcile
        permission. Ask a Finance admin to check this payment against the queue.
      </Alert>
    );
  }

  if (exceptions.length === 0) {
    return (
      <EmptyState
        title="No exceptions filed"
        description="The nightly sweeps have raised nothing against this payment. If the money looks wrong anyway, the payloads tab is where the provider's own account of it lives."
      />
    );
  }

  return (
    <Stack spacing={2}>
      {exceptions.map((x) => (
        <ExceptionCard key={x.id} exception={x} canReconcile={canReconcile} />
      ))}
    </Stack>
  );
}
