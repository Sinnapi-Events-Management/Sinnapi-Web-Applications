import type { Metadata } from "next";
import { Container, Typography, Box } from "@mui/material";
import BuildIcon from "@mui/icons-material/Build";

export const metadata: Metadata = { title: "Down for maintenance", robots: { index: false, follow: false } };

// Reachable directly; a middleware toggle (platform_settings.maintenance_mode)
// can route all traffic here when maintenance is enabled.
export default function MaintenancePage() {
  return (
    <Container sx={{ py: 14, textAlign: "center", maxWidth: 560 }}>
      <Box sx={{ color: "primary.main" }}><BuildIcon sx={{ fontSize: 56 }} /></Box>
      <Typography variant="h3" sx={{ mt: 2 }}>We’ll be right back</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Sinnapi is undergoing scheduled maintenance. Please check back shortly.
      </Typography>
    </Container>
  );
}
