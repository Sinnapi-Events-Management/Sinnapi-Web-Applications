import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@sinnapi/ui';
import { useAuth } from './AuthProvider';

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
