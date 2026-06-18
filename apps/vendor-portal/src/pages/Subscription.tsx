import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Grid, Card, CardContent, Typography, Button, Chip, List, ListItem, ListItemIcon, ListItemText, Box, Alert } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import PageTitle from "@/components/ui/PageTitle";
import QueryState from "@/components/ui/QueryState";
import StatusChip from "@/components/ui/StatusChip";
import VendorGate from "@/vendor/VendorGate";
import { useVendorContext } from "@/vendor/VendorProvider";
import { usePlans } from "@/hooks/queries";
import { supabase } from "@/lib/supabase";
import { formatMoney, titleize } from "@/lib/config";

function PlanGrid({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const { subscription } = useVendorContext();
  const plans = usePlans();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(planId: string) {
    setBusy(planId); setError(null);
    const { error } = await supabase.rpc("choose_subscription_plan", { p_vendor_id: vendorId, p_plan_id: planId });
    setBusy(null);
    if (error) { setError(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-subscription"] });
  }

  return (
    <>
      {subscription && (
        <Alert severity="info" sx={{ mb: 3 }} icon={false}>
          Current subscription: <StatusChip status={subscription.status} />
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <QueryState isLoading={plans.isLoading} error={plans.error}>
        <Grid container spacing={3} alignItems="stretch">
          {(plans.data ?? []).map((p: any) => {
            const features: any[] = p.plan_features ?? [];
            const highlight = p.key === "professional";
            const selected = subscription?.plan_id === p.id;
            return (
              <Grid item xs={12} md={4} key={p.id}>
                <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", borderColor: highlight ? "primary.main" : "divider", borderWidth: highlight ? 2 : 1 }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h4">{p.name}</Typography>
                      {highlight && <Chip size="small" color="primary" label="Popular" />}
                    </Box>
                    <Typography variant="h5" sx={{ my: 1 }}>{formatMoney(p.price, p.currency)}<Typography component="span" variant="body2" color="text.secondary">/{p.billing_cycle}</Typography></Typography>
                    <List dense>
                      {features.filter((f) => f.value !== false && f.value !== "false").map((f) => (
                        <ListItem key={f.feature_key} disableGutters>
                          <ListItemIcon sx={{ minWidth: 30 }}><CheckIcon color="primary" fontSize="small" /></ListItemIcon>
                          <ListItemText primary={titleize(f.feature_key)} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <Box sx={{ p: 2 }}>
                    <Button fullWidth variant={highlight ? "contained" : "outlined"} disabled={busy === p.id || selected} onClick={() => choose(p.id)}>
                      {selected ? "Current plan" : busy === p.id ? "Selecting…" : "Choose plan"}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </QueryState>
    </>
  );
}

export default function Subscription() {
  return (
    <>
      <PageTitle title="Subscription" subtitle="Manage your plan. Inactive subscriptions hide your public listing." />
      <VendorGate>{(vendorId) => <PlanGrid vendorId={vendorId} />}</VendorGate>
    </>
  );
}
