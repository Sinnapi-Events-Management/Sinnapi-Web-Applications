import { Suspense } from 'react';
import { Box, Container, Paper, Typography, CircularProgress } from '@sinnapi/ui/atoms';
import PreferencesPanel from './organisms/preferencesPanel';

/**
 * Email preference centre — the page every newsletter footer links to.
 *
 * Deliberately plain: no hero, no navigation into the marketing site, nothing
 * competing with the one thing the visitor came to do. Somebody who arrived
 * here to stop receiving email should not have to walk past an invitation to
 * browse vendors first.
 *
 * The panel reads the token from the query string via `useSearchParams`, which
 * forces a Suspense boundary in the App Router — without one the whole route
 * opts out of static rendering.
 */
export default function EmailPreferencesContainer() {
  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Email preferences
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Choose what you hear from us — or stop hearing from us entirely. No account needed.
        </Typography>

        <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
          <Suspense
            fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            }
          >
            <PreferencesPanel />
          </Suspense>
        </Paper>
      </Container>
    </Box>
  );
}
