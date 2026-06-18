import type { Metadata } from "next";
import NextLink from "next/link";
import { Container, Grid, Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Button, Chip, Box } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { PageHeader } from "@/components/common/SectionHeading";

export const revalidate = 21600;

export const metadata: Metadata = {
  title: "Pricing",
  description: "Sinnapi vendor subscription plans — Starter, Professional, and Elite.",
  alternates: { canonical: "/pricing" },
};

// Static feature matrix (Step 1 §8). Live prices are managed by admins in the DB.
const PLANS = [
  {
    key: "starter", name: "Starter", highlight: false,
    features: ["Verified Vendor Badge", "Up to 10 portfolio images", "Standard search placement", "Direct messaging", "Quote request system"],
  },
  {
    key: "professional", name: "Professional", highlight: true,
    features: ["Verified Vendor Badge", "Unlimited portfolio images", "Portfolio video", "Priority search placement", "Direct messaging", "Client analytics", "Quote request system"],
  },
  {
    key: "elite", name: "Elite", highlight: false,
    features: ["Verified Vendor Badge", "Unlimited portfolio images", "Portfolio video", "Top-tier search placement", "Direct messaging", "Client analytics", "Homepage featured spot", "Dedicated account manager", "Quote request system"],
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader title="Vendor pricing" subtitle="Start with a 30-day free trial after approval. Choose the plan that fits your business." />
      <Container sx={{ py: 4 }}>
        <Grid container spacing={3} alignItems="stretch">
          {PLANS.map((p) => (
            <Grid item xs={12} md={4} key={p.key}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column", borderColor: p.highlight ? "primary.main" : "divider", borderWidth: p.highlight ? 2 : 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h4">{p.name}</Typography>
                  {p.highlight && <Chip size="small" color="primary" label="Most popular" />}
                </Box>
                <List sx={{ flex: 1, mt: 1 }}>
                  {p.features.map((f) => (
                    <ListItem key={f} disableGutters>
                      <ListItemIcon sx={{ minWidth: 32 }}><CheckIcon color="primary" fontSize="small" /></ListItemIcon>
                      <ListItemText primary={f} />
                    </ListItem>
                  ))}
                </List>
                <Button component={NextLink} href="/apply" variant={p.highlight ? "contained" : "outlined"} fullWidth sx={{ mt: 2 }}>
                  Get started
                </Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
          Prices are shown during onboarding and may vary by billing cycle. Inactive subscriptions hide your public listing until renewed.
        </Typography>
      </Container>
    </>
  );
}
