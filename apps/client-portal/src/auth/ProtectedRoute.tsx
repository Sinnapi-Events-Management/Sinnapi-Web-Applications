import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@sinnapi/ui';
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
  return <>{children}</>;
}
