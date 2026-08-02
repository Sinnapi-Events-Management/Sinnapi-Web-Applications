import { Stack, Button, Typography, Box, Alert, Divider } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import AddIcon from '@mui/icons-material/Add';
import { formatMoney } from '@/lib/config';
import { useQuotationForm } from './hooks/useQuotationForm';
import QuotationLineItem from './components/molecules/QuotationLineItem';

type Props = {
  quotationId: string;
  currency?: string;
};

// Builds quotation line items and sends them via the send_quotation RPC.
export default function QuotationBuilder({ quotationId, currency = 'UGX' }: Props) {
  const { control, error, busy, fields, itemsError, total, addItem, removeItem, submit } =
    useQuotationForm(quotationId);

  return (
    <Stack component="form" onSubmit={submit} noValidate spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {itemsError && <Alert severity="warning">{itemsError}</Alert>}

      {fields.map((field, index) => (
        <QuotationLineItem
          key={field.id}
          index={index}
          control={control}
          canRemove={fields.length > 1}
          onRemove={() => removeItem(index)}
        />
      ))}

      <Button startIcon={<AddIcon />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>
        Add line item
      </Button>
      <Divider />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <ControlledField
          name="valid_days"
          control={control}
          label="Valid for (days)"
          type="number"
          sx={{ width: 160 }}
          inputProps={{ min: 1 }}
        />
        <Typography variant="h6">Total: {formatMoney(total, currency)}</Typography>
      </Box>

      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-end' }}>
        {busy ? 'Sending…' : 'Send quote'}
      </Button>
    </Stack>
  );
}
