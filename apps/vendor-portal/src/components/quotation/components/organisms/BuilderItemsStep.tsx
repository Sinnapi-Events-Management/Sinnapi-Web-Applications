import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
} from '@sinnapi/ui';
import { ControlledCheckbox, ControlledField } from '@sinnapi/ui/forms';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatMoney } from '@/lib/config';
import type { useQuotationForm } from '../../hooks/useQuotationForm';
import QuotationLineItem from '../molecules/QuotationLineItem';
import QuotationPackagePicker from '../molecules/QuotationPackagePicker';
import QuotationAddOnRow from '../molecules/QuotationAddOnRow';

type Props = {
  form: ReturnType<typeof useQuotationForm>;
  currency: string;
  clientRequest: string | null;
};

/**
 * Step 1 — what the vendor will provide. The client's own words sit at the top
 * so the vendor prices what was asked for without switching tabs. Discount,
 * tax and how long the price holds are rarely changed, so they fold away.
 */
export default function BuilderItemsStep({ form: f, currency, clientRequest }: Props) {
  const hasExtras = Number(f.getValues('discount_rate')) > 0 || Number(f.getValues('tax_rate')) > 0;

  return (
    <Stack spacing={2}>
      {clientRequest && (
        <Box sx={{ p: 1.75, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="text.secondary">
            The client asked for
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {clientRequest}
          </Typography>
        </Box>
      )}

      <QuotationPackagePicker
        packages={f.packages}
        isLoading={f.isPackagesLoading}
        applied={f.applied}
        appliedTierId={f.appliedTierId}
        onApply={f.applyPackage}
        onClear={f.clearPackage}
      />

      {f.fields.map((field, index) => (
        <QuotationLineItem
          key={field.id}
          index={index}
          control={f.control}
          canRemove={f.fields.length > 1}
          onRemove={() => f.removeItem(index)}
          currency={currency}
        />
      ))}

      <Button
        startIcon={<AddIcon />}
        onClick={f.addItem}
        variant="outlined"
        sx={{ alignSelf: 'flex-start', minHeight: 44 }}
      >
        Add another item
      </Button>

      <QuotationAddOnRow addOns={f.availableAddOns} currency={currency} onAdd={f.addAddOn} />

      <Accordion
        disableGutters
        defaultExpanded={hasExtras}
        variant="outlined"
        sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box>
            <Typography fontWeight={700}>More options</Typography>
            <Typography variant="body2" color="text.secondary">
              Discount, tax, how long the price is valid
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5}>
              <ControlledField
                name="discount_rate"
                control={f.control}
                label="Discount (%)"
                type="number"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, max: 100, step: 5, inputMode: 'decimal' }}
              />
              <ControlledField
                name="tax_rate"
                control={f.control}
                label="Tax (%)"
                type="number"
                sx={{ flex: 1 }}
                inputProps={{ min: 0, max: 100, step: 0.5, inputMode: 'decimal' }}
              />
            </Stack>
            <ControlledCheckbox
              name="tax_inclusive"
              control={f.control}
              label="My prices already include tax"
            />
            <ControlledField
              name="valid_days"
              control={f.control}
              label="Price is valid for (days)"
              type="number"
              sx={{ width: { xs: '100%', sm: 220 } }}
              inputProps={{ min: 1, inputMode: 'numeric' }}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
        sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}
      >
        <Typography fontWeight={700}>The client pays</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(f.pricing.total, currency)}
        </Typography>
      </Stack>
    </Stack>
  );
}
