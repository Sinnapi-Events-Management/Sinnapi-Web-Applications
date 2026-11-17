import { Alert, Box, Button, Collapse, Stack, Typography } from '@sinnapi/ui';
import {
  ControlledCheckbox,
  ControlledDateField,
  ControlledField,
  ControlledSwitch,
} from '@sinnapi/ui/forms';
import { kampalaToday } from '@sinnapi/ui/documents';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';
import { CURRENCY_OPTIONS, DISCOUNT_TYPE_OPTIONS } from '@/components/documents/schema/invoiceForm';

/**
 * Discount, currency, dates and — only if the vendor adds it — tax.
 *
 * Tax is closed by default and asks for nothing until opened: no TIN, no
 * default rate (confirmed 2026-11-05). A vendor who charges VAT types its
 * name and rate themselves.
 */
/**
 * Everything an invoice rarely needs — discount, currency, the issue date, tax,
 * your TIN, notes and terms — folded under "More options" in step 2.
 */
export default function MoreOptionsSection({ f }: { f: InvoiceFormApi }) {
  const today = kampalaToday();
  const locked = f.isBookingInvoice;

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {!locked && (
          <>
            <ControlledField
              name="discount_type"
              control={f.control}
              label="Discount"
              options={DISCOUNT_TYPE_OPTIONS}
              disabled={f.busy}
            />
            {f.values.discount_type ? (
              <ControlledField
                name="discount_value"
                control={f.control}
                label={
                  f.values.discount_type === 'percentage'
                    ? 'Discount (%)'
                    : `Discount (${f.values.currency})`
                }
                type="text"
                inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                disabled={f.busy}
              />
            ) : (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
            )}
            <ControlledField
              name="currency"
              control={f.control}
              label="Currency"
              options={CURRENCY_OPTIONS}
              disabled={f.busy}
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
          </>
        )}
        <ControlledDateField
          name="issue_date"
          control={f.control}
          label="Invoice date"
          maxDate={today}
          disabled={f.busy}
        />
      </Box>

      {f.hasVendorTaxId && (
        <ControlledCheckbox
          name="show_vendor_tax_id"
          control={f.control}
          label="Show my TIN on this invoice"
          disabled={f.busy}
        />
      )}

      {!locked && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          {!f.values.tax_enabled ? (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Typography variant="body2" color="text.secondary">
                Tax is optional. Add it only if you charge it.
              </Typography>
              <Button
                onClick={() => f.setValue('tax_enabled', true, { shouldDirty: true })}
                disabled={f.busy}
              >
                Add tax
              </Button>
            </Stack>
          ) : (
            <Collapse in appear>
              <Stack spacing={2}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  <ControlledField
                    name="tax_label"
                    control={f.control}
                    label="Tax name (e.g. VAT)"
                    disabled={f.busy}
                  />
                  <ControlledField
                    name="tax_rate"
                    control={f.control}
                    label="Rate (%)"
                    type="text"
                    inputProps={{ inputMode: 'decimal', autoComplete: 'off' }}
                    disabled={f.busy}
                  />
                </Box>
                <ControlledSwitch
                  name="tax_inclusive"
                  control={f.control}
                  label="My prices already include this tax"
                  disabled={f.busy}
                />
                <Button
                  color="inherit"
                  onClick={() =>
                    f.setValue('tax_enabled', false, { shouldDirty: true, shouldValidate: true })
                  }
                  sx={{ alignSelf: 'flex-start' }}
                  disabled={f.busy}
                >
                  Remove tax
                </Button>
              </Stack>
            </Collapse>
          )}
        </Box>
      )}

      {f.pricing.discountExceedsSubtotal && !locked && (
        <Alert severity="warning">The discount is larger than the items it applies to.</Alert>
      )}
      <ControlledField
        name="notes"
        control={f.control}
        label="Notes for the client (optional)"
        multiline
        minRows={2}
        disabled={f.busy}
      />
      <ControlledField
        name="terms"
        control={f.control}
        label="Terms (optional)"
        multiline
        minRows={2}
        disabled={f.busy}
      />
    </Stack>
  );
}
