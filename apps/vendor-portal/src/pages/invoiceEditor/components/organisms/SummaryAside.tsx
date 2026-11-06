import { Alert, Box, Button, Card, CardContent, Divider, Stack, Typography } from '@sinnapi/ui';
import { formatDocumentAmount, formatDocumentMoney } from '@sinnapi/ui/documents';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography
        color={strong ? 'text.primary' : 'text.secondary'}
        fontWeight={strong ? 700 : 400}
      >
        {label}
      </Typography>
      <Typography
        fontWeight={strong ? 700 : 400}
        sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * The running total and the actions. Sticks beside the form on a desktop;
 * on a phone it sits after the form, with the total and "Issue" also in
 * the bar pinned to the bottom of the screen.
 */
export default function SummaryAside({ f }: { f: InvoiceFormApi }) {
  const v = f.preview;
  const cur = v.currency;

  return (
    <Stack spacing={2} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
      <Card variant="outlined">
        <CardContent sx={{ '&:last-child': { pb: 2.5 } }}>
          <Stack spacing={1.25}>
            <Typography variant="h6" component="h2" fontWeight={700}>
              Summary
            </Typography>
            <Row label="Subtotal" value={formatDocumentAmount(v.subtotal, cur)} />
            {v.discountLabel && (
              <Row
                label={v.discountLabel}
                value={`−${formatDocumentAmount(v.discountTotal, cur)}`}
              />
            )}
            {v.charges.map((c, i) => (
              <Row
                key={`${i}-${c.description}`}
                label={c.description || 'Charge'}
                value={formatDocumentAmount(c.lineTotal, cur)}
              />
            ))}
            {v.taxLabel && <Row label={v.taxLabel} value={formatDocumentAmount(v.taxTotal, cur)} />}
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
              <Typography fontWeight={700}>Total</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatDocumentMoney(v.total, cur)}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Worked out again by Sinnapi when you save.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {f.error && <Alert severity="error">{f.error}</Alert>}

      <Stack spacing={1}>
        <Button variant="contained" size="large" onClick={f.requestIssue} disabled={f.busy}>
          {f.issuing ? 'Issuing…' : 'Issue invoice'}
        </Button>
        <Button variant="outlined" onClick={f.saveDraft} disabled={f.busy}>
          {f.saving && !f.issuing ? 'Saving…' : 'Save draft'}
        </Button>
        <Button onClick={f.openPreview} disabled={f.busy}>
          Preview
        </Button>
        {f.invoiceId && (
          <Box sx={{ pt: 1 }}>
            <Button color="error" onClick={f.askDelete} disabled={f.busy} size="small">
              Delete draft
            </Button>
          </Box>
        )}
      </Stack>
    </Stack>
  );
}
