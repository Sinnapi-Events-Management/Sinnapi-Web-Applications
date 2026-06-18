import { Box, Container, Typography, Paper } from "@mui/material";
import { APP } from "@/lib/config";

export default function AuthLayout({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "grey.50" }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: 24, color: "primary.main" }}>
          {APP.name} <Box component="span" sx={{ fontSize: 14, color: "text.secondary" }}>{APP.tagline}</Box>
        </Box>
      </Box>
      <Container maxWidth="sm" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, width: "100%" }}>
          <Typography variant="h4">{title}</Typography>
          {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>{subtitle}</Typography>}
          {!subtitle && <Box sx={{ mb: 2 }} />}
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
