import { Card, CardContent, Typography, Stack, Divider, Button, Box, PageTitle } from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import VendorGate from '@/vendor/VendorGate';
import BankAccountForm from '@/components/bank/BankAccountForm';
import AccountSection from './components/organisms/AccountSection';

export default function Settings() {
  return (
    <>
      <PageTitle title="Settings" subtitle="Account, payout banking, and privacy." />
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <AccountSection />

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccountBalanceIcon color="secondary" />
              <Typography variant="h6">Payout bank account</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <VendorGate>{(vendorId) => <BankAccountForm vendorId={vendorId} />}</VendorGate>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PrivacyTipIcon color="secondary" />
              <Typography variant="h6">Privacy &amp; data</Typography>
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
            <Button
              component={RouterLink}
              to="/privacy"
              variant="text"
              size="small"
              sx={{ mt: 1.5, alignSelf: 'flex-start' }}
            >
              View Privacy Policy
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}
