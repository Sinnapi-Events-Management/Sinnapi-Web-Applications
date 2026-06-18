import { Box, CircularProgress, Typography, Button } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import { useAdmin } from "./AdminProvider";
import { useAuth } from "@/auth/AuthProvider";

// Blocks anyone who is not an admin. Admin accounts are provisioned in the DB
// (no public sign-up); a signed-in non-admin lands on this access-denied screen.
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdmin();
  const { signOut } = useAuth();

  if (loading) {
    return <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><CircularProgress /></Box>;
  }
  if (!isAdmin) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", p: 4 }}>
        <Box>
          <BlockIcon sx={{ fontSize: 56, color: "error.main" }} />
          <Typography variant="h4" sx={{ mt: 2 }}>Access denied</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 420 }}>
            This is the Sinnapi admin console. Your account doesn't have admin access.
          </Typography>
          <Button variant="outlined" sx={{ mt: 3 }} onClick={() => signOut()}>Sign out</Button>
        </Box>
      </Box>
    );
  }
  return <>{children}</>;
}
