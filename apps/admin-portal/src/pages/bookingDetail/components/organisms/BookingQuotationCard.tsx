import { useMemo } from 'react';
import { Button, InfoRow, SectionCard, SimpleTable, Stack, StatusChip } from '@sinnapi/ui';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import DownloadIcon from '@mui/icons-material/Download';
import { formatDate, formatMoney } from '@/lib/config';
import { downloadQuotationPdf } from '@/lib/quotationPdf';
import type { QuotationDocument } from '@/lib/types';
import { quotationItemColumns, toItemRows } from '../../schema/Columns';

type Props = { quotation: QuotationDocument };

/**
 * The quotation this booking came from, when there is one.
 *
 * Rendered rather than linked because the question it answers — "does the
 * booking amount match what was quoted?" — is one an operator is asking *about
 * this booking*, and sending them to another page to answer it loses the
 * comparison. Bookings placed directly against a service carry no quotation at
 * all, so the whole card is absent then.
 *
 * The download reuses `downloadQuotationPdf` unchanged: `get_booking_admin`
 * returns the quotation in the same shape `get_event_quotation` does, so one
 * renderer serves both pages.
 */
export default function BookingQuotationCard({ quotation: q }: Props) {
  const columns = useMemo(() => quotationItemColumns(q.currency), [q.currency]);
  const rows = useMemo(() => toItemRows(q.items), [q.items]);

  return (
    <SectionCard
      title="Quotation"
      icon={<RequestQuoteIcon />}
      accent="info"
      action={<StatusChip status={q.status} />}
    >
      <Stack spacing={2}>
        <Stack>
          <InfoRow
            label="Reference"
            value={q.reference_no}
            copyValue={q.reference_no ?? undefined}
            mono
          />
          <InfoRow label="Sent" value={formatDate(q.sent_at)} />
          <InfoRow label="Valid until" value={formatDate(q.valid_until)} />
          <InfoRow label="Quoted total" value={formatMoney(q.total, q.currency)} />
        </Stack>

        {rows.length > 0 && <SimpleTable columns={columns} rows={rows} getRowId={(r) => r.key} />}

        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => downloadQuotationPdf(q)}
          sx={{ alignSelf: 'flex-start' }}
        >
          Download quotation
        </Button>
      </Stack>
    </SectionCard>
  );
}
