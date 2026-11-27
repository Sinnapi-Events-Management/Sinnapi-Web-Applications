import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Tooltip } from '@sinnapi/ui';
import { documentErrorMessage } from '@sinnapi/ui/documents';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import type { VendorBookingDetailModel } from '@/lib/types';
import { useBookingInvoice, useCreateInvoiceFromBooking } from '@/hooks/documentQueries';

/** Booked, happening or done — the states a booking can be invoiced from. */
const INVOICEABLE = new Set(['confirmed', 'in_progress', 'completed']);

/**
 * The booking's invoice as a header action (moved 2026-11-18 from the bottom
 * of the Money tab, where vendors did not find it): "Create invoice" until
 * there is one, then "Finish invoice" for a draft or "Open invoice".
 *
 * A secondary action — the page's main next step stays in the "What to do
 * now" card. Renders nothing for requests, cancellations and refusals.
 */
export default function BookingInvoiceAction({ booking }: { booking: VendorBookingDetailModel }) {
  const navigate = useNavigate();
  const invoice = useBookingInvoice(booking.id);
  const create = useCreateInvoiceFromBooking();
  const [error, setError] = useState<string | null>(null);
  const row = invoice.data;

  if (!INVOICEABLE.has(booking.status) && !row) return null;

  async function start() {
    setError(null);
    try {
      const id = await create.mutateAsync(booking.id);
      navigate(`/invoices/${id}/edit`);
    } catch (e) {
      setError(documentErrorMessage(e, 'An invoice could not be created for this booking.'));
    }
  }

  const label = !row
    ? create.isPending
      ? 'Creating…'
      : 'Create invoice'
    : row.status === 'draft'
      ? 'Finish invoice'
      : 'Open invoice';

  return (
    <>
      <Tooltip title={error ?? ''} open={!!error} onClose={() => setError(null)} arrow>
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          startIcon={<ReceiptLongIcon />}
          disabled={create.isPending || invoice.isLoading}
          onClick={() =>
            row
              ? navigate(
                  row.status === 'draft' ? `/invoices/${row.id}/edit` : `/invoices/${row.id}`,
                )
              : void start()
          }
          sx={{
            minHeight: 40,
            px: { xs: 1, sm: 1.5 },
            minWidth: 0,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            // Icon dropped on a phone so the amount, Call and this button fit one row.
            '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
          }}
        >
          {label}
        </Button>
      </Tooltip>
    </>
  );
}
