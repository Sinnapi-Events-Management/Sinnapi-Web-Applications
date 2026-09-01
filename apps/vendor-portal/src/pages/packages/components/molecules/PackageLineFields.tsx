import type { Control } from 'react-hook-form';
import { Stack, IconButton, Tooltip } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PackageFormValues } from '../../schema';

type Props = {
  /** Dotted path to this line's object, e.g. `tiers.0.items.2` or `add_ons.1`. */
  path: `tiers.${number}.items.${number}` | `add_ons.${number}`;
  control: Control<PackageFormValues>;
  canRemove: boolean;
  onRemove: () => void;
};

/**
 * One priced line of a package.
 *
 * Wraps to two rows below `sm` rather than shrinking to four unusable columns:
 * a vendor pricing a package on a phone is a real case, and "Unit price"
 * squeezed to 60px is a field that gets typed into wrong.
 *
 * Aligned to `flex-start` so the row keeps its shape when a field grows a
 * validation message underneath it.
 */
export default function PackageLineFields({ path, control, canRemove, onRemove }: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ flex: 1, minWidth: 0 }}
        alignItems="flex-start"
      >
        <ControlledField
          name={`${path}.description`}
          control={control}
          label="Item"
          sx={{ flex: 3, width: '100%' }}
        />
        <Stack direction="row" spacing={1} sx={{ flex: 2.5, width: '100%' }}>
          <ControlledField
            name={`${path}.quantity`}
            control={control}
            label="Qty"
            type="number"
            sx={{ flex: 1 }}
            inputProps={{ min: 1 }}
          />
          <ControlledField
            name={`${path}.unit_label`}
            control={control}
            label="Unit"
            placeholder="per hour"
            sx={{ flex: 1.2 }}
          />
          <ControlledField
            name={`${path}.unit_price`}
            control={control}
            label="Unit price"
            type="number"
            sx={{ flex: 1.5 }}
            inputProps={{ min: 0 }}
          />
        </Stack>
      </Stack>

      <Tooltip title={canRemove ? 'Remove line' : 'A tier needs at least one line'}>
        {/* Span so the tooltip still fires while the button is disabled. */}
        <span>
          <IconButton aria-label="Remove line" onClick={onRemove} disabled={!canRemove}>
            <DeleteOutlineIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
