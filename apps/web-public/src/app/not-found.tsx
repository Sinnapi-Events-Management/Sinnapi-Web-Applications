import NextLink from 'next/link';
import { Container, Typography, Button, Stack } from '@sinnapi/ui';

export default function NotFound() {
  return (
    <Container sx={{ py: 12, textAlign: 'center', maxWidth: 560 }}>
      <Typography variant="h1" sx={{ fontSize: '5rem', color: 'primary.main' }}>
        404
      </Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>
        Page not found
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        The page you’re looking for doesn’t exist or may have moved.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="center"
        sx={{ mt: 4 }}
      >
        <Button component={NextLink} href="/" variant="contained">
          Back home
        </Button>
        <Button component={NextLink} href="/vendors" variant="outlined">
          Browse vendors
        </Button>
      </Stack>
    </Container>
  );
}
