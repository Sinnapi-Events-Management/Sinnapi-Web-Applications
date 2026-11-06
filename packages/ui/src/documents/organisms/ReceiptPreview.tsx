'use client';
import { Box } from '@mui/material';
import { PAPER } from '../paper';
import { formatDocumentDate, formatDocumentMoney } from '../money';
import { amountInWords } from '../amountInWords';
import { RECEIPT_METHOD_LABELS } from '../documentStatus';
import { partyLines } from '../views';
import type { ReceiptView } from '../types';
import { PaperLabel } from '../atoms/PaperLabel';
import { PaperField } from '../molecules/PaperField';
import { VendorBrandBlock } from '../molecules/VendorBrandBlock';
import { DocumentHeading } from '../molecules/DocumentHeading';
import { MoneyRows, type MoneyRow } from '../molecules/MoneyRows';
import { DocumentPaper } from './DocumentPaper';

/**
 * A payment receipt as it prints. The amount received is the largest thing
 * on the page, written out in words beneath it; the invoice balance follows
 * when the receipt is linked, or the vendor's own outstanding figure when
 * it is standalone.
 */
export function ReceiptPreview({ receipt }: { receipt: ReceiptView }) {
  const cur = receipt.currency;
  const isVoid = receipt.status === 'void';

  const balanceRows: MoneyRow[] = [];
  if (receipt.invoice) {
    const paidBefore = Math.max(receipt.invoice.total - receipt.invoice.balanceBefore, 0);
    balanceRows.push(
      {
        label: `Invoice total${receipt.invoice.documentNo ? ` (${receipt.invoice.documentNo})` : ''}`,
        value: formatDocumentMoney(receipt.invoice.total, cur),
      },
      { label: 'Paid before this receipt', value: formatDocumentMoney(paidBefore, cur) },
      { label: 'This payment', value: formatDocumentMoney(receipt.amount, cur) },
    );
  }
  if (receipt.balanceAfter !== null) {
    balanceRows.push({
      label: 'Outstanding balance',
      value: formatDocumentMoney(receipt.balanceAfter, cur),
      emphasis: true,
    });
  }

  return (
    <DocumentPaper
      documentNo={receipt.documentNo}
      isVoid={isVoid}
      label={`Receipt ${receipt.documentNo}`}
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
        <VendorBrandBlock vendor={receipt.vendor} />
        <DocumentHeading
          title="PAYMENT RECEIPT"
          documentNo={receipt.documentNo}
          stamp={isVoid ? { label: 'VOID', tone: 'void' } : null}
        />
      </Box>

      <Box
        sx={{
          borderRadius: '14px',
          bgcolor: PAPER.band,
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2.5, sm: 3.75 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <PaperLabel>Amount received</PaperLabel>
          <Box
            sx={{
              fontSize: { xs: 30, sm: 42 },
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
            }}
          >
            {formatDocumentMoney(receipt.amount, cur)}
          </Box>
          <Box sx={{ fontSize: 13, color: PAPER.body }}>{amountInWords(receipt.amount, cur)}</Box>
        </Box>
        {!isVoid && (
          <Box
            sx={{
              px: 1.75,
              py: 1,
              borderRadius: 999,
              bgcolor: PAPER.paper,
              color: PAPER.successInk,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.8px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            RECEIVED
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: { xs: 2.5, sm: '22px 32px' },
        }}
      >
        <PaperField
          label="Received from"
          value={receipt.recipient.name}
          lines={partyLines(receipt.recipient)}
          strong
        />
        <PaperField label="Payment date" value={formatDocumentDate(receipt.paymentDate)} />
        <PaperField label="Payment method" value={RECEIPT_METHOD_LABELS[receipt.paymentMethod]} />
        {receipt.paymentReference && (
          <PaperField label="Transaction reference" value={receipt.paymentReference} />
        )}
        <Box sx={{ gridColumn: { sm: 'span 2' } }}>
          <PaperField label="For" value={receipt.description} />
        </Box>
      </Box>

      {balanceRows.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <PaperLabel>{receipt.invoice ? 'Invoice balance' : 'Balance'}</PaperLabel>
          <Box sx={{ border: `1px solid ${PAPER.rule}`, borderRadius: '10px', px: 2.25, py: 0.5 }}>
            <MoneyRows rows={balanceRows} width="100%" />
          </Box>
        </Box>
      )}

      {receipt.notes && <PaperField label="Notes" value={receipt.notes} preLine />}
      {isVoid && receipt.voidReason && <PaperField label="Voided" value={receipt.voidReason} />}

      <Box sx={{ mt: 'auto', fontSize: 12, color: PAPER.muted }}>
        Received and confirmed by {receipt.vendor.business_name} on{' '}
        {formatDocumentDate(receipt.confirmedAt)}.
      </Box>
    </DocumentPaper>
  );
}
