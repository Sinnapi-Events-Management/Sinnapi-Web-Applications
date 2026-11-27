import { Navigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@sinnapi/ui';
import { useAuth } from './AuthProvider';

/**
 * Gate for anything behind sign-in.
 *
 * The `session` this reads is not "any Supabase session" — `AuthProvider` only
 * publishes one the client portal's own gate has admitted, and signs out the
 * ones it refuses. So the check here stays a plain null test while still
 * meaning "belongs in this portal", and there is exactly one place (the
 * provider) where that rule is decided.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, offline, retry } = useAuth();
  const location = useLocation();

  // A saved session is waiting for the server. Saying so — rather than an
  // endless spinner, or worse, the sign-in form — tells the person their
  // account is fine and it is the connection that needs a moment.
  if (loading && offline) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 2 }}>
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 360, textAlign: 'center' }}>
          <CircularProgress size={28} />
          <Typography variant="h6">No internet connection</Typography>
          <Typography variant="body2" color="text.secondary">
            You are still signed in. We will open Sinnapi as soon as your connection is back.
          </Typography>
          <Button variant="outlined" onClick={retry}>
            Try again
          </Button>
        </Stack>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!session) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
}
