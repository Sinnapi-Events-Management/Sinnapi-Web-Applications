import { Button, Paper, Stack, Typography } from '@sinnapi/ui';
import { formatDocumentMoney } from '@sinnapi/ui/documents';
import type { InvoiceFormApi } from '../../hooks/useInvoiceForm';

/** Phones only: the total and "Issue" stay in reach while the vendor scrolls the form. */
export default function MobileActionBar({ f }: { f: InvoiceFormApi }) {
  return (
    <Paper
      elevation={6}
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'sticky',
        bottom: 12,
        zIndex: (t) => t.zIndex.appBar - 1,
        px: 2,
        py: 1.25,
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Stack spacing={0}>
        <Typography variant="caption" color="text.secondary">
          Total
        </Typography>
        <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDocumentMoney(f.preview.total, f.preview.currency)}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button onClick={f.openPreview} disabled={f.busy}>
          Preview
        </Button>
        <Button variant="contained" onClick={f.requestIssue} disabled={f.busy}>
          Issue
        </Button>
      </Stack>
    </Paper>
  );
}
