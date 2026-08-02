import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@sinnapi/ui';
import { useAuth } from './AuthProvider';

/**
 * Gate for anything behind sign-in.
 *
 * The `session` this reads is not "any Supabase session" — `AuthProvider` only
 * publishes one the admin console's own gate has admitted, and signs out the
 * ones it refuses. So the check here stays a plain null test while still
 * meaning "is staff", and there is exactly one place (the provider) where that
 * rule is decided. `AdminGate` still runs deeper in the tree and answers the
 * separate question of which parts of the console this staff member may see.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

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

  // Accounts provisioned with a one-time password carry `must_change_password`
  // in their auth metadata (set by create-staff / reset-staff-password). Hold
  // them on the change-password screen until they've chosen their own — but let
  // that screen itself render, or the redirect would loop.
  const mustChangePassword = Boolean(session.user?.user_metadata?.must_change_password);
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}
