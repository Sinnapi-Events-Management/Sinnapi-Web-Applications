import { Alert, Box, QuotationLineItems, Stack, Typography } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { useQuotationForm } from '../../hooks/useQuotationForm';
import { advanceAmount } from '../../schema';

type Props = {
  form: ReturnType<typeof useQuotationForm>;
  currency: string;
  clientName: string;
};

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Step 3 — "Check & send": exactly what the client will see, built from the
 * form as it stands. Before this, "Send quote" sent with one tap and the
 * vendor only saw the result afterwards.
 */
export default function BuilderReviewStep({ form: f, currency, clientName }: Props) {
  const v = f.getValues();
  const items = v.items
    .filter((i) => i.description.trim() || Number(i.unit_price) > 0)
    .map((i, idx) => ({
      id: String(idx),
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
      line_total: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    }));
  const p = f.pricing;
  const rate = Number(v.advance_rate) || 0;
  const advance = advanceAmount(p.total, v.advance_rate);
  const days = Number(v.advance_release_days_before) || 0;
  const validDays = Number(v.valid_days) || 14;

  return (
    <Stack spacing={2.5}>
      <Typography variant="body1" color="text.secondary">
        This is what <b>{clientName}</b> will see. If something is wrong, go back and change it.
      </Typography>

      {f.error && <Alert severity="error">{f.error}</Alert>}

      <Box sx={{ p: { xs: 1.5, sm: 2 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <QuotationLineItems
          items={items}
          pricing={{
            currency,
            subtotal: p.base,
            discount: p.discount,
            offerDiscount: 0,
            totalSaving: p.discount,
            tax: p.tax,
            total: p.total,
            isPriced: items.length > 0,
            isDerived: false,
          }}
          totalLabel="The client pays"
        />
      </Box>

      <Stack spacing={1}>
        <Typography variant="body1">
          <b>When you get paid:</b>{' '}
          {rate > 0
            ? `${formatMoney(advance, currency)} ${days > 0 ? `${days} days before the event` : 'when the client pays'}, the rest after the work is done.`
            : 'everything after the work is done.'}
        </Typography>
        <Typography variant="body1">
          <b>Price valid until:</b> {formatDate(addDays(validDays))}
        </Typography>
        {v.advance_terms_note?.trim() && (
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            <b>Your message:</b> {v.advance_terms_note.trim()}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
