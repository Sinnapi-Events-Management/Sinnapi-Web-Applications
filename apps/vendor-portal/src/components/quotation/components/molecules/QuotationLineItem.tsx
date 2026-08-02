import type { Control } from 'react-hook-form';
import { Stack, IconButton } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import DeleteIcon from '@mui/icons-material/Delete';
import type { QuotationFormValues } from '../../schema';

type Props = {
  index: number;
  control: Control<QuotationFormValues>;
  /** Disabled on the last remaining row — a quote needs at least one line. */
  canRemove: boolean;
  onRemove: () => void;
};

/**
 * One editable quote line. Aligned to `flex-start` rather than centred so the
 * row keeps its shape when a field grows a validation message underneath it.
 */
export default function QuotationLineItem({ index, control, canRemove, onRemove }: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <ControlledField
        name={`items.${index}.description`}
        control={control}
        label="Description"
        sx={{ flex: 3 }}
      />
      <ControlledField
        name={`items.${index}.quantity`}
        control={control}
        label="Qty"
        type="number"
        sx={{ flex: 1 }}
        inputProps={{ min: 1 }}
      />
      <ControlledField
        name={`items.${index}.unit_price`}
        control={control}
        label="Unit price"
        type="number"
        sx={{ flex: 1.5 }}
        inputProps={{ min: 0 }}
      />
      <IconButton aria-label="Remove line item" onClick={onRemove} disabled={!canRemove}>
        <DeleteIcon />
      </IconButton>
    </Stack>
  );
}
