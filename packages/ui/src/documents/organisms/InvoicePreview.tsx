'use client';
import { Box } from '@mui/material';
import { PAPER } from '../paper';
import {
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentMoney,
  kampalaToday,
} from '../money';
import { invoiceDisplayStatus, type InvoiceDisplayStatus } from '../documentStatus';
import { balanceLine } from '../paymentCoverage';
import { partyLines } from '../views';
import type { InvoiceView } from '../types';
import { PaperLabel } from '../atoms/PaperLabel';
import { PaperField } from '../molecules/PaperField';
import { VendorBrandBlock } from '../molecules/VendorBrandBlock';
import { DocumentHeading, type DocumentStampTone } from '../molecules/DocumentHeading';
import { InvoiceLinesTable } from '../molecules/InvoiceLinesTable';
import { MoneyRows, type MoneyRow } from '../molecules/MoneyRows';
import { DocumentPaper } from './DocumentPaper';

const STAMPS: Partial<Record<InvoiceDisplayStatus, { label: string; tone: DocumentStampTone }>> = {
  draft: { label: 'DRAFT', tone: 'neutral' },
  partially_paid: { label: 'PARTLY PAID', tone: 'warning' },
  overdue: { label: 'OVERDUE', tone: 'warning' },
  paid: { label: 'PAID', tone: 'success' },
  overpaid: { label: 'OVERPAID', tone: 'success' },
  void: { label: 'CANCELLED', tone: 'void' },
};

const ESCROW_PAY_NOTE =
  'This booking is paid securely through Sinnapi. Open the booking in your Sinnapi account to pay.';

function MetaCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        bgcolor: highlight ? PAPER.band : 'transparent',
        minWidth: 0,
      }}
    >
      <PaperLabel>{label}</PaperLabel>
      <Box
        sx={{
          fontSize: highlight ? 15 : 13.5,
          fontWeight: highlight ? 700 : 400,
          fontVariantNumeric: 'tabular-nums',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

/**
 * An invoice as it prints. Drawn from an `InvoiceView`, so a draft being
 * typed, an issued invoice the vendor opens and the one the client opens
 * all render through this one component — and the PDF follows the same
 * layout.
 */
export function InvoicePreview({
  invoice,
  today = kampalaToday(),
}: {
  invoice: InvoiceView;
  today?: string;
}) {
  const display = invoiceDisplayStatus(invoice.status, invoice.dueDate, today);
  const cur = invoice.currency;
  const isEscrow = invoice.paymentChannel === 'sinnapi_escrow';
  // A negative balance prints as "Overpaid by", never as a minus figure.
  const balance = balanceLine(invoice.balanceDue, cur);

  const rows: MoneyRow[] = [
    { label: 'Subtotal', value: formatDocumentAmount(invoice.subtotal, cur) },
  ];
  if (invoice.discountLabel) {
    rows.push({
      label: invoice.discountLabel,
      value: `−${formatDocumentAmount(invoice.discountTotal, cur)}`,
    });
  }
  invoice.charges.forEach((c) =>
    rows.push({ label: c.description, value: formatDocumentAmount(c.lineTotal, cur) }),
  );
  if (invoice.taxLabel)
    rows.push({ label: invoice.taxLabel, value: formatDocumentAmount(invoice.taxTotal, cur) });
  rows.push({ label: 'Total', value: formatDocumentMoney(invoice.total, cur), emphasis: true });
  if (invoice.amountPaid > 0) {
    rows.push({
      label: 'Paid to date',
      value: `−${formatDocumentAmount(invoice.amountPaid, cur)}`,
    });
  }

  const payText = isEscrow ? ESCROW_PAY_NOTE : invoice.paymentInstructions;
  const notes = [invoice.notes, invoice.terms].filter(Boolean).join('\n\n');

  return (
    <DocumentPaper
      documentNo={invoice.documentNo}
      isVoid={invoice.status === 'void'}
      label={`Invoice ${invoice.documentNo ?? 'draft'}`}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 3,
        }}
      >
        <VendorBrandBlock vendor={invoice.vendor} />
        <DocumentHeading
          title="INVOICE"
          documentNo={invoice.documentNo}
          stamp={STAMPS[display] ?? null}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
          border: `1px solid ${PAPER.rule}`,
          borderRadius: '10px',
          overflow: 'hidden',
          '& > *:not(:first-of-type)': { borderLeft: { sm: `1px solid ${PAPER.rule}` } },
        }}
      >
        <MetaCell label="Issued" value={formatDocumentDate(invoice.issueDate)} />
        <MetaCell label="Due" value={formatDocumentDate(invoice.dueDate)} />
        <MetaCell label="Currency" value={cur} />
        <MetaCell label={balance.label} value={balance.value} highlight />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 3,
        }}
      >
        <PaperField
          label="Bill to"
          value={invoice.recipient.name || '—'}
          lines={partyLines(invoice.recipient)}
          strong
        />
        {invoice.title && <PaperField label="For" value={invoice.title} />}
      </Box>

      <InvoiceLinesTable items={invoice.items} currency={cur} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: { xs: 3, sm: 5 },
        }}
      >
        <Box
          sx={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 2.25, minWidth: 0 }}
        >
          {payText && <PaperField label="How to pay" value={payText} preLine />}
          {notes && <PaperField label="Notes & terms" value={notes} preLine />}
          {invoice.status === 'void' && invoice.voidReason && (
            <PaperField label="Cancelled" value={invoice.voidReason} />
          )}
        </Box>
        <MoneyRows
          rows={rows}
          band={{ label: balance.label.toUpperCase(), value: balance.value }}
        />
      </Box>
    </DocumentPaper>
  );
}
