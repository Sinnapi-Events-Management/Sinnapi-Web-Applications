'use client';
import { useEffect } from 'react';
import NextLink from 'next/link';
import { Container, Typography, Button, Stack } from '@sinnapi/ui/atoms';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook into observability (Step 7 §9) here.
    console.error(error);
  }, [error]);

  return (
    <Container sx={{ py: 12, textAlign: 'center', maxWidth: 560 }}>
      <Typography variant="h3">Something went wrong</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        We hit an unexpected error. Please try again — if it persists, contact support.
      </Typography>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="center"
        sx={{ mt: 4 }}
      >
        <Button variant="contained" onClick={() => reset()}>
          Try again
        </Button>
        <Button component={NextLink} href="/" variant="outlined">
          Back home
        </Button>
      </Stack>
    </Container>
  );
}
