import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorClients } from '@/hooks/queries';
import {
  useVendorBusinessCard,
  useVendorContacts,
  useVendorInvoice,
} from '@/hooks/documentQueries';

/**
 * Loads everything the editor needs before the form mounts: the draft being
 * edited (if any), the clients the vendor can bill on Sinnapi, their saved
 * clients, and their business details for the preview.
 *
 * The form itself lives in `useInvoiceForm`, mounted only once this has
 * finished — react-hook-form reads `defaultValues` once, so mounting it
 * before the draft arrived would open an empty form over a saved one.
 *
 * An invoice that is no longer a draft cannot be edited, so opening its
 * edit URL lands on its page instead.
 */
export function useInvoiceEditor(vendorId: string, invoiceId: string | undefined) {
  const navigate = useNavigate();
  const invoice = useVendorInvoice(invoiceId);
  const clients = useVendorClients();
  const contacts = useVendorContacts(vendorId);
  const card = useVendorBusinessCard(vendorId);

  const row = invoice.data ?? null;

  useEffect(() => {
    if (row && row.status !== 'draft') navigate(`/invoices/${row.id}`, { replace: true });
  }, [row, navigate]);

  const loading =
    (!!invoiceId && invoice.isLoading) || clients.isLoading || contacts.isLoading || card.isLoading;

  return {
    loading,
    error: invoice.error ?? card.error ?? null,
    notFound: !!invoiceId && !invoice.isLoading && !invoice.error && !row,
    row: row && row.status === 'draft' ? row : null,
    clients: clients.data ?? [],
    contacts: contacts.data ?? [],
    card: card.data ?? null,
  };
}
