import { Box, CircularProgress, Alert } from '@sinnapi/ui';
import { useAuthCallback } from './hooks/useAuthCallback';

export default function AuthCallback() {
  const { error } = useAuthCallback();

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      {error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}
    </Box>
  );
}
