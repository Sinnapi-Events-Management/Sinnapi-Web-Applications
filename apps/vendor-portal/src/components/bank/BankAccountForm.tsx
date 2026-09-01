import { Stack, Button, Alert, Grid, Snackbar, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import { useBankAccountForm } from './hooks/useBankAccountForm';
import BankAccountOnFile from './molecules/BankAccountOnFile';

// Calls set_vendor_bank_account RPC, which ENCRYPTS the account number server-side.
// The raw number is never read back to the client (only last4 is shown elsewhere).
//
// ## Why the fields are grouped the way they are
//
// Single column is the safer default for forms, and it is what this form used to
// be — four stacked boxes in a 480px well. The exception the research allows is
// short, *conceptually paired* fields, and there is exactly one such pair here:
// bank name and branch, which together name where the account is held.
//
// Account number does NOT join a pair, on purpose. A typo in it is discovered
// weeks later as a failed payout (see the schema's note on the format rule), and
// a field sitting beside another is the one most often skimmed or mis-tabbed. It
// keeps its own full-width line, in a monospace face, so the digits are grouped
// the way the vendor reads them off a statement.
//
// The form caps at 640px rather than filling the card: the card is now wide, and
// a text input stretched across it is harder to scan, not easier. The width the
// page gained is spent on the column beside it, not on longer inputs.
export default function BankAccountForm({ vendorId }: { vendorId: string }) {
  const { control, current, loadingCurrent, error, busy, toast, dismissToast, submit } =
    useBankAccountForm(vendorId);

  return (
    <Stack spacing={3}>
      <BankAccountOnFile account={current} loading={loadingCurrent} />

      <Stack component="form" spacing={2.5} onSubmit={submit} noValidate sx={{ maxWidth: 640 }}>
        <Typography variant="body2" color="text.secondary">
          {current
            ? 'Re-enter your details to change where payouts land. Your account number is encrypted and never displayed again, so it cannot be pre-filled.'
            : 'Used for payouts. Your account number is encrypted and never displayed again — re-enter it to change it.'}
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <ControlledField name="bank_name" control={control} label="Bank name" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <ControlledField name="branch" control={control} label="Branch (optional)" />
          </Grid>
          <Grid item xs={12}>
            <ControlledField
              name="account_name"
              control={control}
              label="Account name"
              helperText="Exactly as it appears on your bank statement."
            />
          </Grid>
          <Grid item xs={12}>
            <ControlledField
              name="account_number"
              control={control}
              label="Account number"
              autoComplete="off"
              inputProps={{ inputMode: 'numeric', spellCheck: false }}
              sx={{ '& input': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }}
            />
          </Grid>
        </Grid>

        <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: 'flex-start' }}>
          {busy ? 'Saving…' : current ? 'Update bank account' : 'Save bank account'}
        </Button>

        <Snackbar
          open={toast}
          autoHideDuration={3000}
          onClose={dismissToast}
          message="Bank account saved (pending verification)"
        />
      </Stack>
    </Stack>
  );
}
