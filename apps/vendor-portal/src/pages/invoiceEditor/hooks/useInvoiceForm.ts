import { useMemo, useState } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useLeaveGuard, useZodForm } from '@sinnapi/ui/forms';
import { useToast } from '@sinnapi/ui';
import { useLogoGate } from '@/components/businessLogo';
import {
  addDays,
  discountLabel,
  documentErrorMessage,
  invoicePricing,
  taxLabel,
  toAmount,
  toInvoiceView,
  type ContactRow,
  type InvoiceRow,
  type InvoiceView,
} from '@sinnapi/ui/documents';
import type { VendorClientModel } from '@/lib/types';
import {
  snapshotFor,
  useDeleteInvoiceDraft,
  useIssueInvoice,
  useSaveInvoiceDraft,
  useVendorBusinessCard,
} from '@/hooks/documentQueries';
import {
  emptyInvoiceValues,
  emptyLine,
  invoiceFormSchema,
  invoicePayload,
  invoiceValuesFromRow,
  type InvoiceFormValues,
} from '@/components/documents/schema/invoiceForm';
import { useLocationNotice } from '@/components/documents/hooks/useLocationNotice';

type Card = ReturnType<typeof useVendorBusinessCard>['data'];

type Args = {
  row: InvoiceRow | null;
  clients: VendorClientModel[];
  contacts: ContactRow[];
  card: Card;
};

/**
 * The invoice editor's state: the form, its lines, the live total, the
 * preview, and the three things a vendor can do with a draft — save it,
 * issue it, or delete it.
 *
 * The total shown while typing comes from `invoicePricing`, the browser
 * mirror of the database's formula. What is stored is always the
 * database's own recomputation: every save sends the raw lines and rates,
 * never a total.
 */
export function useInvoiceForm({ row, clients, contacts, card }: Args) {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(row?.id ?? null);

  useLocationNotice(toast.success);

  const save = useSaveInvoiceDraft();
  const issue = useIssueInvoice();
  const { requireLogo } = useLogoGate();
  const remove = useDeleteInvoiceDraft();

  const isBookingInvoice = row?.payment_channel === 'sinnapi_escrow';

  const form = useZodForm(invoiceFormSchema, {
    defaultValues: row ? invoiceValuesFromRow(row) : emptyInvoiceValues(),
  });
  const { control, handleSubmit, setValue, reset, formState } = form;
  const items = useFieldArray({ control, name: 'items' });
  const values = useWatch({ control }) as InvoiceFormValues;

  const busy = save.isPending || issue.isPending || remove.isPending;
  useLeaveGuard(formState.isDirty && !busy);

  const pricing = useMemo(
    () =>
      invoicePricing({
        currency: values.currency,
        lines: (values.items ?? []).map((l) => ({
          kind: l.kind,
          quantity: l.quantity,
          unitPrice: l.unit_price,
        })),
        discountType: values.discount_type || null,
        discountValue: values.discount_value,
        taxRate: values.tax_enabled ? values.tax_rate : null,
        taxInclusive: values.tax_inclusive,
      }),
    [
      values.currency,
      values.items,
      values.discount_type,
      values.discount_value,
      values.tax_enabled,
      values.tax_rate,
      values.tax_inclusive,
    ],
  );

  const clientName = clients.find((c) => c.client_id === values.client_id)?.display_name ?? '';

  /** What the invoice will look like, from what is on screen right now. */
  const preview: InvoiceView = useMemo(() => {
    const vendor = snapshotFor(card, {
      showTaxId: values.show_vendor_tax_id,
      external: values.recipient_mode === 'external',
    }) ?? { business_name: '' };

    if (isBookingInvoice && row) {
      // Lines and money are fixed to the booking; only the wording moves.
      const base = toInvoiceView(row, vendor);
      return {
        ...base,
        title: values.title || null,
        issueDate: values.issue_date,
        dueDate: values.due_date,
        notes: values.notes || null,
        terms: values.terms || null,
        recipient: { ...base.recipient, address: values.recipient_address || null },
      };
    }

    const lines = (values.items ?? []).map((l, i) => ({
      kind: l.kind,
      description: l.description,
      quantity: toAmount(l.quantity),
      unitPrice: toAmount(l.unit_price),
      lineTotal: pricing.lineTotals[i] ?? 0,
    }));
    const external = values.recipient_mode === 'external';
    return {
      documentNo: null,
      status: 'draft',
      paymentChannel: 'vendor_collected',
      title: values.title || null,
      issueDate: values.issue_date,
      dueDate: values.due_date,
      currency: values.currency,
      vendor,
      recipient: external
        ? {
            name: values.recipient_name,
            company: values.recipient_company || null,
            email: values.recipient_email || null,
            phone: values.recipient_phone || null,
            address: values.recipient_address || null,
          }
        : { name: clientName, address: values.recipient_address || null },
      items: lines.filter((l) => l.kind === 'item' && (l.description || l.lineTotal)),
      charges: lines.filter((l) => l.kind === 'charge' && (l.description || l.lineTotal)),
      subtotal: pricing.subtotal,
      discountLabel: discountLabel(
        values.discount_type || null,
        values.discount_value,
        pricing.discountTotal,
      ),
      discountTotal: pricing.discountTotal,
      taxLabel: values.tax_enabled
        ? taxLabel(values.tax_label, values.tax_rate, values.tax_inclusive)
        : null,
      taxInclusive: values.tax_inclusive,
      taxTotal: pricing.taxTotal,
      total: pricing.total,
      amountPaid: 0,
      balanceDue: pricing.total,
      paymentInstructions: values.payment_instructions || null,
      notes: values.notes || null,
      terms: values.terms || null,
      voidReason: null,
    };
  }, [values, pricing, card, clientName, isBookingInvoice, row]);

  /**
   * Save the form as the draft. A brand-new draft moves to its own edit URL
   * (which remounts this page), so the confirmation travels as a notice in
   * the navigation state rather than a toast that would unmount with it.
   */
  async function persist(v: InvoiceFormValues, notice: string | null): Promise<string | null> {
    setError(null);
    try {
      const id = await save.mutateAsync({ id: invoiceId, draft: invoicePayload(v) });
      setInvoiceId(id);
      reset(v); // what is saved is no longer "unsaved"
      if (!invoiceId && notice) {
        navigate(`/invoices/${id}/edit`, { replace: true, state: { notice } });
      } else if (notice) {
        toast.success(notice);
      }
      return id;
    } catch (e) {
      setError(documentErrorMessage(e, 'This draft could not be saved.'));
      return null;
    }
  }

  const saveDraft = handleSubmit(async (v) => {
    await persist(v, 'Draft saved');
  });

  const requestIssue = handleSubmit(() => {
    if (pricing.total <= 0 && !isBookingInvoice) {
      setError('An invoice must be for more than zero.');
      return;
    }
    // The logo prints at the top of the issued invoice — ask for it first.
    requireLogo('invoice', () => setConfirmIssue(true));
  });

  const doIssue = handleSubmit(async (v) => {
    const id = await persist(v, null);
    if (!id) {
      setConfirmIssue(false);
      return;
    }
    try {
      const res = await issue.mutateAsync(id);
      setConfirmIssue(false);
      navigate(`/invoices/${id}`, {
        replace: true,
        state: { notice: `Invoice ${res.document_no} issued` },
      });
    } catch (e) {
      setConfirmIssue(false);
      setError(documentErrorMessage(e, 'This invoice could not be issued.'));
    }
  });

  async function doDelete() {
    if (!invoiceId) return;
    try {
      await remove.mutateAsync(invoiceId);
      reset(values);
      navigate('/invoices', { replace: true });
    } catch (e) {
      setConfirmDelete(false);
      setError(documentErrorMessage(e, 'This draft could not be deleted.'));
    }
  }

  return {
    control,
    setValue,
    values,
    items,
    addLine: (kind: 'item' | 'charge') => items.append(emptyLine(kind)),
    setDueInDays: (days: number) =>
      setValue('due_date', addDays(values.issue_date, days), {
        shouldDirty: true,
        shouldValidate: true,
      }),
    pricing,
    preview,
    isBookingInvoice,
    hasVendorTaxId: !!card?.tax_id,
    invoiceId,
    error,
    busy,
    saving: save.isPending,
    issuing: issue.isPending,
    saveDraft,
    requestIssue,
    confirmIssue,
    doIssue,
    cancelIssue: () => setConfirmIssue(false),
    confirmDelete,
    askDelete: () => setConfirmDelete(true),
    cancelDelete: () => setConfirmDelete(false),
    doDelete,
    deleting: remove.isPending,
    previewOpen,
    openPreview: () => setPreviewOpen(true),
    closePreview: () => setPreviewOpen(false),
    contacts,
    clients,
    toast: toast.toast,
    dismissToast: toast.dismiss,
  };
}

export type InvoiceFormApi = ReturnType<typeof useInvoiceForm>;
