import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Alert } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';

// Handles the PKCE / email-confirmation redirect (detectSessionInUrl also runs,
// but we exchange explicitly to be safe) then routes into the app.
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
      }
      navigate('/dashboard', { replace: true });
    })();
  }, [params, navigate]);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      {error ? <Alert severity="error">{error}</Alert> : <CircularProgress />}
    </Box>
  );
}
