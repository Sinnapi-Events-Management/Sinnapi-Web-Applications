import { Stack, Button, Box, Alert, Divider, MoneyBreakdown } from '@sinnapi/ui';
import { ControlledField, ControlledCheckbox } from '@sinnapi/ui/forms';
import AddIcon from '@mui/icons-material/Add';
import { useQuotationForm } from './hooks/useQuotationForm';
import QuotationLineItem from './components/molecules/QuotationLineItem';
import QuotationPackagePicker from './components/molecules/QuotationPackagePicker';
import QuotationAddOnRow from './components/molecules/QuotationAddOnRow';
import AdvanceTermsFields from './components/molecules/AdvanceTermsFields';

type Props = {
  quotationId: string;
  currency?: string;
  /** The vendor whose packages may be quoted from. */
  vendorId?: string | null;
  /** The package the client asked about, when they requested against one. */
  requestedPackageId?: string | null;
  requestedTierId?: string | null;
};

/**
 * Builds quotation line items and sends them via the `send_quotation` RPC.
 *
 * The order is the order the work happens in: pick the package you already
 * priced, adjust its lines, add the extras this client asked for, set what
 * comes off and what goes on, then agree the advance. A vendor with no
 * packages sees exactly what they saw before — the picker renders nothing —
 * so quoting from scratch stays a first-class path rather than a fallback.
 */
export default function QuotationBuilder({
  quotationId,
  currency = 'UGX',
  vendorId,
  requestedPackageId,
  requestedTierId,
}: Props) {
  const {
    control,
    error,
    busy,
    fields,
    itemsError,
    pricing,
    advanceRate,
    advanceDays,
    addItem,
    removeItem,
    packages,
    isPackagesLoading,
    applied,
    appliedTierId,
    availableAddOns,
    applyPackage,
    clearPackage,
    addAddOn,
    submit,
  } = useQuotationForm(quotationId, {
    vendorId: vendorId ?? undefined,
    requestedPackageId,
    requestedTierId,
  });

  return (
    <Stack component="form" onSubmit={submit} noValidate spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {itemsError && <Alert severity="warning">{itemsError}</Alert>}

      <QuotationPackagePicker
        packages={packages}
        isLoading={isPackagesLoading}
        applied={applied}
        appliedTierId={appliedTierId}
        onApply={applyPackage}
        onClear={clearPackage}
      />

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

      <QuotationAddOnRow addOns={availableAddOns} currency={currency} onAdd={addAddOn} />

      <Divider />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start">
        <Stack spacing={2} sx={{ flex: 1, width: '100%' }}>
          <Stack direction="row" spacing={2}>
            <ControlledField
              name="discount_rate"
              control={control}
              label="Discount (%)"
              type="number"
              sx={{ flex: 1 }}
              inputProps={{ min: 0, max: 100, step: 5 }}
            />
            <ControlledField
              name="tax_rate"
              control={control}
              label="Tax (%)"
              type="number"
              sx={{ flex: 1 }}
              inputProps={{ min: 0, max: 100, step: 0.5 }}
            />
          </Stack>
          <ControlledCheckbox
            name="tax_inclusive"
            control={control}
            label="Prices above already include tax"
          />
          <ControlledField
            name="valid_days"
            control={control}
            label="Valid for (days)"
            type="number"
            sx={{ width: 160 }}
            inputProps={{ min: 1 }}
          />
        </Stack>

        {/* The breakdown, not just a total: the client is about to be shown
            subtotal, discount and tax as separate lines, and the vendor should
            be looking at the same document before they send it. */}
        <Box sx={{ flex: 1, width: '100%' }}>
          <MoneyBreakdown
            currency={currency}
            lines={[
              { label: 'Subtotal', amount: pricing.base },
              ...(pricing.discount > 0
                ? [{ label: `Discount (${pricing.discountRate}%)`, amount: -pricing.discount }]
                : []),
              ...(pricing.tax > 0
                ? [
                    {
                      label: `Tax (${pricing.taxRate}%)`,
                      amount: pricing.tax,
                      additive: !pricing.taxInclusive,
                      muted: pricing.taxInclusive,
                      hint: pricing.taxInclusive
                        ? 'Already inside the prices above.'
                        : 'Added on top of the prices above.',
                    },
                  ]
                : []),
            ]}
            total={{ label: 'The client pays', amount: pricing.total }}
          />
        </Box>
      </Stack>

      <AdvanceTermsFields
        control={control}
        total={pricing.total}
        currency={currency}
        rate={advanceRate}
        daysBefore={advanceDays}
      />

      <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-end' }}>
        {busy ? 'Sending…' : 'Send quote'}
      </Button>
    </Stack>
  );
}
