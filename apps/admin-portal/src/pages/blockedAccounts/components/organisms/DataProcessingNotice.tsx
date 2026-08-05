import { Alert, AlertTitle, Box, Typography } from '@sinnapi/ui';

/**
 * The lawful-basis notice for the staff using this page.
 *
 * Not decoration and not a cookie banner. This page shows other people's IP
 * addresses, devices and countries; the staff reading it are the ones who have
 * to stay inside the basis it is collected under, and a policy document nobody
 * opens does not achieve that. Stating the purpose, the basis and the retention
 * where the data is actually looked at is what makes the internal standard
 * operative rather than aspirational.
 *
 * No consent is sought because none is required: this is Art. 6(1)(f)
 * legitimate interest — detecting and preventing unauthorised access to
 * accounts — which is also why the scope is deliberately narrow (country, not
 * city; masked IPs by default; 90-day deletion).
 */
export default function DataProcessingNotice() {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
      <AlertTitle sx={{ fontWeight: 600 }}>Security data — handle accordingly</AlertTitle>
      <Typography variant="body2" component="div">
        Sign-in attempts, devices, and approximate location are recorded to detect and prevent
        unauthorised account access (GDPR Art. 6(1)(f), legitimate interest). Use this page for that
        purpose only.
        <Box component="ul" sx={{ pl: 2.5, mb: 0, mt: 0.75 }}>
          <li>Location is country-level only — no city or precise geolocation is collected.</li>
          <li>IP addresses are masked by default; revealing one is recorded in the audit log.</li>
          <li>Opening this page is recorded in the audit log.</li>
          <li>Attempt records are deleted automatically after 90 days.</li>
        </Box>
      </Typography>
    </Alert>
  );
}
