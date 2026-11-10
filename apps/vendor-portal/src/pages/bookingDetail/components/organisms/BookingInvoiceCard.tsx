import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import {
  DocumentStatusChip,
  documentErrorMessage,
  formatDocumentMoney,
  invoiceDisplayStatus,
} from '@sinnapi/ui/documents';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingInvoice, useCreateInvoiceFromBooking } from '@/hooks/documentQueries';

const INVOICEABLE = new Set(['confirmed', 'in_progress', 'completed']);

/**
 * The booking's invoice: open it, or create it from the quotation.
 *
 * A booking invoice is paid through Sinnapi escrow and marks itself paid
 * when the client pays, so this card never offers "Record payment".
 * Hidden until the booking is confirmed — there is nothing to bill yet.
 */
export default function BookingInvoiceCard({ booking }: { booking: VendorBookingDetailModel }) {
  const navigate = useNavigate();
  const invoice = useBookingInvoice(booking.id);
  const create = useCreateInvoiceFromBooking();
  const [error, setError] = useState<string | null>(null);

  if (!INVOICEABLE.has(booking.status) && !invoice.data) return null;

  async function start() {
    setError(null);
    try {
      const id = await create.mutateAsync(booking.id);
      navigate(`/invoices/${id}/edit`);
    } catch (e) {
      setError(documentErrorMessage(e, 'An invoice could not be created for this booking.'));
    }
  }

  const row = invoice.data;

  return (
    <SectionCard
      title="Invoice"
      icon={<ReceiptLongIcon />}
      accent="secondary"
      action={
        row ? (
          <DocumentStatusChip
            kind="invoice"
            status={invoiceDisplayStatus(row.status, row.due_date)}
          />
        ) : undefined
      }
    >
      <Stack spacing={1.5}>
        {row ? (
          <>
            <Typography variant="body2" color="text.secondary">
              {row.document_no ?? 'Draft'}
              {row.status !== 'draft' &&
                ` · still owed ${formatDocumentMoney(row.balance_due, row.currency)}`}
            </Typography>
            <Button
              variant="outlined"
              onClick={() =>
                navigate(
                  row.status === 'draft' ? `/invoices/${row.id}/edit` : `/invoices/${row.id}`,
                )
              }
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              {row.status === 'draft' ? 'Finish the draft' : 'Open invoice'}
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Send your client an invoice for this booking, filled in from the quote. They pay it
              through Sinnapi.
            </Typography>
            <Button
              variant="outlined"
              onClick={start}
              disabled={create.isPending || invoice.isLoading}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
            >
              {create.isPending ? 'Creating…' : 'Create invoice'}
            </Button>
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </SectionCard>
  );
}
