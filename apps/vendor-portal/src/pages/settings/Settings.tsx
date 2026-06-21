import {
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  Button,
  Box,
  TextField,
  Snackbar,
} from '@sinnapi/ui';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import BankAccountForm from '@/components/bank/BankAccountForm';
import { useSettings } from './hooks/useSettings';

function AccountSection() {
  const { profile, isLoading, error, busy, toast, setToast, save } = useSettings();

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AccountCircleIcon color="primary" />
          <Typography variant="h6">Account</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <QueryState isLoading={isLoading} error={error}>
          {profile && (
            <Stack component="form" spacing={2.5} onSubmit={save} sx={{ maxWidth: 480 }}>
              <Typography variant="body2" color="text.secondary">
                Signed in as <strong>{profile.email}</strong>
              </Typography>
              <TextField
                name="full_name"
                label="Your name"
                defaultValue={profile.full_name ?? ''}
                required
              />
              <TextField name="phone" label="Phone" defaultValue={profile.phone ?? ''} />
              <Button
                type="submit"
                variant="contained"
                disabled={busy}
                sx={{ alignSelf: 'flex-start' }}
              >
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          )}
        </QueryState>
        <Snackbar
          open={toast}
          autoHideDuration={3000}
          onClose={() => setToast(false)}
          message="Account updated"
        />
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  return (
    <>
      <PageTitle title="Settings" subtitle="Account, payout banking, and privacy." />
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <AccountSection />

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccountBalanceIcon color="primary" />
              <Typography variant="h6">Payout bank account</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <VendorGate>{(vendorId) => <BankAccountForm vendorId={vendorId} />}</VendorGate>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PrivacyTipIcon color="primary" />
              <Typography variant="h6">Privacy & data</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Request a copy of your data or deletion, subject to legal and financial retention.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined">Export my data</Button>
              <Button variant="outlined" color="error">
                Request data deletion
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}
