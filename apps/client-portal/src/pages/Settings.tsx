import { Card, CardContent, Typography, Stack, Divider, Button, Box } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import PageTitle from "@/components/ui/PageTitle";

export default function Settings() {
  return (
    <>
      <PageTitle title="Settings" subtitle="Account, security, and privacy." />
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <SecurityIcon color="primary" /><Typography variant="h6">Security</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Change your password or enable two-factor authentication for extra protection.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined">Change password</Button>
              <Button variant="outlined">Enable 2FA</Button>
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <PrivacyTipIcon color="primary" /><Typography variant="h6">Privacy & data</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Request a copy of your data or ask us to delete your personal data, subject to legal retention.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined">Export my data</Button>
              <Button variant="outlined" color="error">Request data deletion</Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}
