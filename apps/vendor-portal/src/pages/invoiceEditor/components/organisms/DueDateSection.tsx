import { Chip, Stack, Typography } from '@sinnapi/ui';
import { ControlledDateField } from '@sinnapi/ui/forms';
import { DUE_PRESETS } from '@/components/documents/schema/invoiceForm';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';

/**
 * When the client should pay — the one date nearly every invoice changes, so
 * it stays out of "More options". One tap for the usual answers.
 */
export default function DueDateSection({ f }: { f: InvoiceFormApi }) {
  const daysOut =
    f.values.issue_date && f.values.due_date
      ? Math.round((Date.parse(f.values.due_date) - Date.parse(f.values.issue_date)) / 86_400_000)
      : null;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={700}>
        When should the client pay?
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {DUE_PRESETS.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            clickable
            color={daysOut === p.days ? 'secondary' : 'default'}
            variant={daysOut === p.days ? 'filled' : 'outlined'}
            onClick={() => f.setDueInDays(p.days)}
            disabled={f.busy}
            sx={{ height: 40 }}
          />
        ))}
      </Stack>
      <ControlledDateField
        name="due_date"
        control={f.control}
        label="Or pick the date"
        minDate={f.values.issue_date || undefined}
        disabled={f.busy}
      />
    </Stack>
  );
}
