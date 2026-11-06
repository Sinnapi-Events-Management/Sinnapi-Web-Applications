import { Alert, Box, Button, Chip, Collapse, Stack, Typography } from '@sinnapi/ui';
import {
  ControlledCheckbox,
  ControlledDateField,
  ControlledField,
  ControlledSwitch,
} from '@sinnapi/ui/forms';
import { kampalaToday } from '@sinnapi/ui/documents';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';
import {
  CURRENCY_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  DUE_PRESETS,
} from '@/components/documents/schema/invoiceForm';
import SectionCard from '../molecules/SectionCard';

/**
 * Discount, currency, dates and — only if the vendor adds it — tax.
 *
 * Tax is closed by default and asks for nothing until opened: no TIN, no
 * default rate (confirmed 2026-11-05). A vendor who charges VAT types its
 * name and rate themselves.
 */
export default function TermsSection({ f }: { f: InvoiceFormApi }) {
  const today = kampalaToday();
  const locked = f.isBookingInvoice;
  const daysOut =
    f.values.issue_date && f.values.due_date
      ? Math.round((Date.parse(f.values.due_date) - Date.parse(f.values.issue_date)) / 86_400_000)
      : null;

  return (
    <SectionCard title="Discount, dates and currency">
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
          label="Issue date"
          maxDate={today}
          disabled={f.busy}
        />
        <ControlledDateField
          name="due_date"
          control={f.control}
          label="Due date"
          minDate={f.values.issue_date || undefined}
          disabled={f.busy}
        />
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Due:
        </Typography>
        {DUE_PRESETS.map((p) => (
          <Chip
            key={p.label}
            label={p.label}
            clickable
            color={daysOut === p.days ? 'secondary' : 'default'}
            variant={daysOut === p.days ? 'filled' : 'outlined'}
            onClick={() => f.setDueInDays(p.days)}
            disabled={f.busy}
          />
        ))}
      </Stack>

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
    </SectionCard>
  );
}
