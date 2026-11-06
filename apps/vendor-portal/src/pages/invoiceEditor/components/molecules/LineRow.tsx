import type { Control } from 'react-hook-form';
import { Box, IconButton, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import CloseIcon from '@mui/icons-material/Close';
import type { InvoiceFormValues } from '@/components/documents/schema/invoiceForm';

type Props = {
  index: number;
  control: Control<InvoiceFormValues>;
  kind: 'item' | 'charge';
  amount: string;
  canRemove: boolean;
  onRemove: () => void;
  disabled?: boolean;
};

/**
 * One editable line. A grid on wider screens (description, qty, price,
 * amount, remove); on a phone it stacks, so no field is narrower than a
 * thumb. A charge (transport, service) has no quantity to speak of, so it
 * shows description and amount only.
 */
export default function LineRow({
  index,
  control,
  kind,
  amount,
  canRemove,
  onRemove,
  disabled,
}: Props) {
  const isCharge = kind === 'charge';
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr 1fr 44px',
          sm: isCharge ? 'minmax(0, 1fr) 160px 120px 44px' : 'minmax(0, 1fr) 90px 150px 120px 44px',
        },
        gridTemplateAreas: {
          xs: isCharge
            ? '"desc desc rm" "price total total"'
            : '"desc desc rm" "qty price price" "total total total"',
          sm: isCharge ? '"desc price total rm"' : '"desc qty price total rm"',
        },
        gap: 1.25,
        alignItems: 'flex-start',
        pb: { xs: 1.5, sm: 0 },
        borderBottom: { xs: 1, sm: 0 },
        borderColor: 'divider',
      }}
    >
      <Box sx={{ gridArea: 'desc' }}>
        <ControlledField
          name={`items.${index}.description`}
          control={control}
          label={isCharge ? 'Charge (e.g. Transport)' : 'Description'}
          size="small"
          disabled={disabled}
        />
      </Box>
      {!isCharge && (
        <Box sx={{ gridArea: 'qty' }}>
          <ControlledField
            name={`items.${index}.quantity`}
            control={control}
            label="Qty"
            type="text"
            size="small"
            inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
            disabled={disabled}
          />
        </Box>
      )}
      <Box sx={{ gridArea: 'price' }}>
        <ControlledField
          name={`items.${index}.unit_price`}
          control={control}
          label={isCharge ? 'Amount' : 'Unit price'}
          type="text"
          size="small"
          inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
          disabled={disabled}
        />
      </Box>
      <Typography
        sx={{
          gridArea: 'total',
          textAlign: { xs: 'left', sm: 'right' },
          pt: { sm: 1 },
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
        }}
        aria-label="Line amount"
      >
        {amount}
      </Typography>
      <Box sx={{ gridArea: 'rm', display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton aria-label="Remove line" onClick={onRemove} disabled={!canRemove || disabled}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
