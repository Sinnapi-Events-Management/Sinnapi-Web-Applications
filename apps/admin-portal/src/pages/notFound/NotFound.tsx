import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button } from '@sinnapi/ui';

export default function NotFound() {
  return (
    <Box
      sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 4 }}
    >
      <Box>
        <Typography variant="h1" sx={{ fontSize: '4rem', color: 'secondary.dark' }}>
          404
        </Typography>
        <Typography variant="h5">Page not found</Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained" sx={{ mt: 3 }}>
          Back to dashboard
        </Button>
      </Box>
    </Box>
  );
}
