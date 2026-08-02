import { useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import {
  quotationFormSchema,
  emptyQuotationValues,
  emptyQuotationItem,
  quotationTotal,
  toSendQuotationArgs,
} from '../schema';

/**
 * Builds and sends a quotation's line items.
 *
 * `useFieldArray` owns the rows so each one carries its own validation state —
 * the previous version filtered blank descriptions out silently at send time,
 * which meant a mistyped row vanished from the quote without the vendor ever
 * being told. Now an incomplete row blocks the send and says which field is
 * wrong.
 *
 * The total is derived from watched values rather than stored, so it can never
 * disagree with what the vendor is looking at.
 */
export function useQuotationForm(quotationId: string) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useZodForm(quotationFormSchema, { defaultValues: emptyQuotationValues });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'send_quotation',
      toSendQuotationArgs(values, quotationId),
    );
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-quotation', quotationId] });
    qc.invalidateQueries({ queryKey: ['v-quotations'] });
  });

  return {
    control,
    error,
    busy: isSubmitting,
    fields,
    /** The array-level message, e.g. every row was removed. */
    itemsError: errors.items?.root?.message ?? errors.items?.message,
    total: quotationTotal(items ?? []),
    addItem: () => append(emptyQuotationItem),
    removeItem: remove,
    submit,
  };
}
