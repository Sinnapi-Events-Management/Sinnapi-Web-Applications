import { Navigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Typography } from '@sinnapi/ui';
import { useAuth } from './AuthProvider';

/**
 * Gate for anything behind sign-in.
 *
 * The `session` this reads is not "any Supabase session" — `AuthProvider` only
 * publishes one the vendor portal's own gate has admitted, and signs out the
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
  // The route this visit was actually for. Carried across both redirects
  // below, not just the sign-in one: a vendor promoted with a one-time password
  // who follows a deep link out of a notification email has to clear two gates
  // before reaching it, and either gate dropping the destination loses it just
  // as completely.
  const returnTo = encodeURIComponent(location.pathname + location.search);

  if (!session) {
    return <Navigate to={`/sign-in?returnTo=${returnTo}`} replace />;
  }

  // Vendors whose account was provisioned server-side with a one-time password
  // (promote-intake, on application approval) carry `must_change_password` in
  // their auth metadata. Hold them on the change-password screen until they've
  // chosen their own — but let that screen itself render, or the redirect would
  // loop.
  const mustChangePassword = Boolean(session.user?.user_metadata?.must_change_password);
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to={`/change-password?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
