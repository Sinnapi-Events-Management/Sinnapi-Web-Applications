import { Alert, AlertTitle, Button, Stack } from '@sinnapi/ui';

type Props = {
  owed: string;
  overBy: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The "record anyway?" step before a payment that is more than the invoice
 * still owes. Clients do overpay; the vendor just has to mean it.
 */
export default function OverpaymentConfirm({ owed, overBy, busy, onConfirm, onCancel }: Props) {
  return (
    <Alert severity="warning" role="alertdialog" aria-live="assertive">
      <AlertTitle>This is {overBy} more than is owed</AlertTitle>
      Only {owed} is still owed on this invoice. If your client really paid more, record it — the
      invoice will show as overpaid so you can agree a refund or credit.
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
        <Button variant="contained" color="warning" onClick={onConfirm} disabled={busy}>
          {busy ? 'Recording…' : 'Record anyway'}
        </Button>
        <Button color="inherit" onClick={onCancel} disabled={busy}>
          Change the amount
        </Button>
      </Stack>
    </Alert>
  );
}
