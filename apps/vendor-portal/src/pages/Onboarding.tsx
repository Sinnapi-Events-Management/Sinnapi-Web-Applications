import { Card, CardContent, Typography, Stack, Stepper, Step, StepLabel, Alert, Button, Box } from "@mui/material";
import PageTitle from "@/components/ui/PageTitle";
import QueryState from "@/components/ui/QueryState";
import StatusChip from "@/components/ui/StatusChip";
import { useMyApplication } from "@/hooks/queries";
import { useVendorContext } from "@/vendor/VendorProvider";
import { APP } from "@/lib/config";

const STEPS = ["Submitted", "Under review", "Due diligence", "MOU signed", "Approved"];
const STATUS_TO_STEP: Record<string, number> = {
  draft: 0, submitted: 1, under_review: 1, pending_info: 1, due_diligence: 2, mou_pending: 3, mou_signed: 3, approved: 4, rejected: 1,
};

export default function Onboarding() {
  const { vendor } = useVendorContext();
  const app = useMyApplication();

  return (
    <>
      <PageTitle title="Onboarding" subtitle="Track your vendor application." />
      <QueryState isLoading={app.isLoading} error={app.error}>
        {vendor ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Your business is approved and listed. Head to your <strong>Dashboard</strong> to manage bookings.
          </Alert>
        ) : !app.data ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h5">Start your vendor application</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                The full multi-step application (business details, media, verification documents, banking, references,
                and terms) is completed on the public site’s vendor application flow.
              </Typography>
              <Button variant="contained" href={`${APP.publicUrl}/apply`}>Open application</Button>
            </CardContent>
          </Card>
        ) : (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h5">{app.data.business_name}</Typography>
                <StatusChip status={app.data.status} />
                {app.data.is_reapplication && <Typography variant="caption" color="text.secondary">(re-application)</Typography>}
              </Stack>
              {app.data.status === "rejected" ? (
                <Alert severity="error">
                  Your application was not approved. {app.data.rejection_reason ?? ""} You may re-apply from the public site.
                </Alert>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <Stepper activeStep={STATUS_TO_STEP[app.data.status] ?? 0} alternativeLabel>
                    {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
                  </Stepper>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </QueryState>
    </>
  );
}
