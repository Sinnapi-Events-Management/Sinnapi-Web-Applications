'use client';
import { Box, Button, Typography } from '@sinnapi/ui/atoms';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import EmptyState from '@/components/molecules/emptyState';

/**
 * The catalogue failed to load. Deliberately distinct from "no plans": telling
 * someone we have nothing to sell because their connection dropped is a lie
 * they'd act on by leaving. Retry goes through TanStack Query's `refetch`, so
 * recovering costs one request rather than a page reload.
 *
 * No prices are shown here, and that is the point — a fallback to figures baked
 * into the bundle would quietly advertise stale pricing on the one page where
 * a wrong number is a commitment we'd have to honour.
 */
export function PlansError({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 2 }} role="alert">
      <ErrorOutline sx={{ fontSize: 48, color: 'error.light' }} />
      <Typography variant="h5" sx={{ mt: 2 }}>
        We couldn’t load our plans
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 440, mx: 'auto' }}>
        Something went wrong on our side — your plan options are still there. Try again in a moment,
        or get in touch and we’ll walk you through them.
      </Typography>
      <Button variant="contained" startIcon={<Refresh />} onClick={onRetry} sx={{ mt: 3 }}>
        Try again
      </Button>
    </Box>
  );
}

/**
 * The catalogue loaded and is genuinely empty — every plan deactivated, or a
 * deployment without Supabase configured. Rare, but it must not read as a
 * broken page: the CTA keeps the funnel intact so a vendor can still apply and
 * be quoted directly.
 */
export function PlansEmpty() {
  return (
    <EmptyState
      title="Plans are being updated"
      description="Our subscription pricing is being refreshed right now. Start your application and we’ll confirm the current rates with you during onboarding."
      ctaLabel="Become a vendor"
      ctaHref="/apply"
    />
  );
}
