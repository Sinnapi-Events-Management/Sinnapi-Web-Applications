import { Alert, Button, Stack, Typography } from '@sinnapi/ui';
import { InvoiceLinesTable, formatDocumentAmount } from '@sinnapi/ui/documents';
import AddIcon from '@mui/icons-material/Add';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';
import SectionCard from '../molecules/SectionCard';
import LineRow from '../molecules/LineRow';

/**
 * What the vendor is charging for. Items make the subtotal (a discount
 * applies to them); charges like transport are added after the discount.
 * A booking invoice shows its quotation's lines read-only: the client pays
 * exactly the booking amount through Sinnapi.
 */
export default function ItemsSection({ f }: { f: InvoiceFormApi }) {
  if (f.isBookingInvoice) {
    return (
      <SectionCard title="What you are charging for">
        <Alert severity="info">
          These lines come from the booking’s quotation and cannot change here — your client pays
          the booking amount through Sinnapi.
        </Alert>
        <InvoiceLinesTable items={f.preview.items} currency={f.preview.currency} />
      </SectionCard>
    );
  }

  const fields = f.items.fields;
  const itemCount = fields.filter((x) => x.kind === 'item').length;
  const amountAt = (i: number) =>
    formatDocumentAmount(f.pricing.lineTotals[i] ?? 0, f.values.currency);

  return (
    <SectionCard title="What you are charging for">
      <Stack spacing={1.5}>
        {fields.map((field, index) =>
          field.kind === 'item' ? (
            <LineRow
              key={field.id}
              index={index}
              control={f.control}
              kind="item"
              amount={amountAt(index)}
              canRemove={itemCount > 1}
              onRemove={() => f.items.remove(index)}
              disabled={f.busy}
            />
          ) : null,
        )}
        <Button
          startIcon={<AddIcon />}
          onClick={() => f.addLine('item')}
          sx={{ alignSelf: 'flex-start' }}
          disabled={f.busy}
        >
          Add item
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Extra charges — added after any discount
        </Typography>
        {fields.map((field, index) =>
          field.kind === 'charge' ? (
            <LineRow
              key={field.id}
              index={index}
              control={f.control}
              kind="charge"
              amount={amountAt(index)}
              canRemove
              onRemove={() => f.items.remove(index)}
              disabled={f.busy}
            />
          ) : null,
        )}
        <Button
          startIcon={<AddIcon />}
          onClick={() => f.addLine('charge')}
          sx={{ alignSelf: 'flex-start' }}
          disabled={f.busy}
        >
          Add charge
        </Button>
      </Stack>
    </SectionCard>
  );
}
