import { useEffect, useMemo, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useZodForm } from '@sinnapi/ui/forms';
import {
  amountInputNumber,
  balanceLine,
  documentErrorMessage,
  formatDocumentMoney,
  roundMoney,
} from '@sinnapi/ui/documents';
import { useRecordReceipt } from '@/hooks/documentQueries';
import { useLogoGate } from '@/components/businessLogo';
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
  /** Negative once the invoice is overpaid. */
  balanceDue: number;
};

/**
 * Recording a payment, linked to an invoice or standalone.
 *
 * One idempotency key per open form, so a double-click — or a retry after a
 * timeout that actually reached the server — returns the receipt already
 * made instead of a second one (`record_receipt` keys on it).
 *
 * MORE THAN IS OWED (1106b)
 * A linked payment may exceed the balance — clients round up, tip or pay
 * twice — but never silently. The first submit stops and asks; only
 * "Record anyway" sends `allow_overpayment`, and the server refuses an
 * overpayment without it. Changing the amount withdraws the answer.
 */
export function useReceiptForm(
  linked: LinkedInvoice | null,
  onDone: (result: { id: string; documentNo: string }) => void,
) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [askOverpay, setAskOverpay] = useState(false);
  const record = useRecordReceipt();
  const { requireLogo } = useLogoGate();

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

  useEffect(() => setAskOverpay(false), [amount]);

  const money = useMemo(() => {
    if (!linked) return null;
    const owed = Math.max(linked.balanceDue, 0);
    const typed = amountInputNumber(amount);
    const value = Number.isFinite(typed) ? typed : 0;
    const after = roundMoney(linked.balanceDue - value, linked.currency);
    return {
      owed,
      after,
      overBy: roundMoney(Math.max(value - owed, 0), linked.currency),
    };
  }, [linked, amount]);

  async function save(values: ReceiptFormValues, allowOverpayment: boolean) {
    setError(null);
    try {
      const res = await record.mutateAsync({
        ...receiptPayload(values, { invoiceId: linked?.id ?? null, idempotencyKey }),
        ...(allowOverpayment ? { allow_overpayment: true } : {}),
      });
      onDone({ id: res.id, documentNo: res.document_no });
    } catch (e) {
      setError(documentErrorMessage(e, 'This payment could not be recorded.'));
    }
  }

  const submit = handleSubmit((values) => {
    // The logo prints at the top of the receipt — ask for it first, then
    // carry on exactly where the vendor was.
    return requireLogo('receipt', () => {
      if (money && money.overBy > 0) {
        setAskOverpay(true);
        return;
      }
      return save(values, false);
    });
  });

  const confirmOverpay = handleSubmit((values) => save(values, true));

  const cur = linked?.currency ?? currency;
  const afterLine = money ? balanceLine(money.after, cur, 'Still owed after this payment') : null;

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
    balanceText: afterLine ? `${afterLine.label}: ${afterLine.value}` : null,
    overpaid: !!money && money.overBy > 0,
    /** Set while the form is waiting for "Record anyway". */
    overpay:
      askOverpay && money
        ? {
            owed: formatDocumentMoney(money.owed, cur),
            overBy: formatDocumentMoney(money.overBy, cur),
            confirm: confirmOverpay,
            cancel: () => setAskOverpay(false),
          }
        : null,
  };
}
