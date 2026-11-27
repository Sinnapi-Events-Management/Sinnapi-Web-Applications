import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { Box, IconButton, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { formatMoney } from '@/lib/config';
import type { QuotationFormValues } from '../../schema';

type Props = {
  index: number;
  control: Control<QuotationFormValues>;
  canRemove: boolean;
  onRemove: () => void;
  currency: string;
};

/**
 * One thing the vendor will provide, as a small card: what it is on its own
 * full-width line, then how many and the price for one, then what that comes
 * to. The old single row squeezed "Qty" and "Unit price" to "Q." and "Uni…"
 * on a phone.
 */
export default function QuotationLineItem({
  index,
  control,
  canRemove,
  onRemove,
  currency,
}: Props) {
  const line = useWatch({ control, name: `items.${index}` });
  const lineTotal = (Number(line?.quantity) || 0) * (Number(line?.unit_price) || 0);

  return (
    <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Item {index + 1}
        </Typography>
        {canRemove && (
          <IconButton aria-label={`Remove item ${index + 1}`} onClick={onRemove} size="small">
            <DeleteOutlineIcon />
          </IconButton>
        )}
      </Stack>
      <Stack spacing={1.5}>
        <ControlledField
          name={`items.${index}.description`}
          control={control}
          label="What you will provide"
          placeholder="e.g. Photography, 8 hours"
          fullWidth
        />
        <Stack direction="row" spacing={1.5}>
          <ControlledField
            name={`items.${index}.quantity`}
            control={control}
            label="How many"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 1, inputMode: 'numeric' }}
          />
          <ControlledField
            name={`items.${index}.unit_price`}
            control={control}
            label={`Price for one (${currency})`}
            type="number"
            sx={{ flex: 2 }}
            inputProps={{ min: 0, inputMode: 'numeric' }}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'right' }}>
          Comes to{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {formatMoney(lineTotal, currency)}
          </Box>
        </Typography>
      </Stack>
    </Box>
  );
}
