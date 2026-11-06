import { useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useZodForm } from '@sinnapi/ui/forms';
import {
  documentErrorMessage,
  formatDocumentMoney,
  roundMoney,
  toAmount,
} from '@sinnapi/ui/documents';
import { useRecordReceipt } from '@/hooks/documentQueries';
import {
  emptyReceiptValues,
  receiptFormSchema,
  receiptPayload,
  wantsReference,
  type ReceiptFormValues,
} from '../schema/receiptForm';

export type LinkedInvoice = {
  id: string;
  documentNo: string;
  currency: string;
  balanceDue: number;
};

/**
 * Recording a payment, linked to an invoice or standalone.
 *
 * One idempotency key per open form, so a double-click — or a retry after a
 * timeout that actually reached the server — returns the receipt already
 * made instead of a second one (`record_receipt` keys on it).
 */
export function useReceiptForm(
  linked: LinkedInvoice | null,
  onDone: (result: { id: string; documentNo: string }) => void,
) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const record = useRecordReceipt();

  const form = useZodForm(receiptFormSchema, {
    defaultValues: emptyReceiptValues(
      linked ? { currency: linked.currency, balanceDue: linked.balanceDue } : null,
    ),
  });
  const { control, handleSubmit, setValue } = form;

  const mode = useWatch({ control, name: 'recipient_mode' });
  const contactId = useWatch({ control, name: 'contact_id' });
  const method = useWatch({ control, name: 'payment_method' });
  const amount = useWatch({ control, name: 'amount' });
  const currency = useWatch({ control, name: 'currency' });

  const balanceAfter = useMemo(() => {
    if (!linked) return null;
    const after = roundMoney(linked.balanceDue - toAmount(amount), linked.currency);
    return after;
  }, [linked, amount]);

  const submit = handleSubmit(async (values: ReceiptFormValues) => {
    setError(null);
    try {
      const res = await record.mutateAsync(
        receiptPayload(values, { invoiceId: linked?.id ?? null, idempotencyKey }),
      );
      onDone({ id: res.id, documentNo: res.document_no });
    } catch (e) {
      setError(documentErrorMessage(e, 'This payment could not be recorded.'));
    }
  });

  return {
    control,
    setValue,
    submit,
    busy: record.isPending,
    error,
    mode,
    contactId,
    showReference: wantsReference(method),
    currency,
    balanceText:
      linked && balanceAfter !== null
        ? balanceAfter < 0
          ? `That is more than the ${formatDocumentMoney(linked.balanceDue, linked.currency)} still owed.`
          : `Still owed after this payment: ${formatDocumentMoney(balanceAfter, linked.currency)}`
        : null,
    overpaid: balanceAfter !== null && balanceAfter < 0,
  };
}
