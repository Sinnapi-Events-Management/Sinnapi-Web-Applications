import { Suspense } from 'react';
import { Box, CircularProgress, Container, Paper } from '@sinnapi/ui/atoms';
import ConfirmPanel from './organisms/confirmPanel';

/**
 * Landing page for the double opt-in confirmation link.
 *
 * The panel reads its token from the query string, which forces a Suspense
 * boundary in the App Router — without one the whole route opts out of static
 * rendering.
 */
export default function SubscriptionConfirmContainer() {
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            }
          >
            <ConfirmPanel />
          </Suspense>
        </Paper>
      </Container>
    </Box>
  );
}
