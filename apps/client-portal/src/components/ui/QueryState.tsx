import { Box, CircularProgress, Alert } from "@mui/material";

// Wraps the common loading/error pattern for a TanStack Query-backed view.
export default function QueryState({
  isLoading, error, children,
}: {
  isLoading: boolean;
  error: unknown;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Alert severity="error">{error instanceof Error ? error.message : "Something went wrong."}</Alert>;
  }
  return <>{children}</>;
}
