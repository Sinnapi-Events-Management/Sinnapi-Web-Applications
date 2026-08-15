'use client';
import { Box, Button, CircularProgress, Stack, Typography, Link } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import NextLink from 'next/link';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { CONTACT } from '@sinnapi/utils';
import { useSubscriptionConfirm, type ConfirmOutcome } from '../../hooks/useSubscriptionConfirm';

/**
 * Copy per outcome.
 *
 * Four distinct messages rather than success/failure, because each one leaves
 * the reader in a different place and needs a different next step:
 *
 *   confirmed  done — say so warmly and get out of the way.
 *   already    they clicked twice, or bookmarked the link. Reassure; do not
 *              imply anything went wrong.
 *   expired    they DID want this and came back a week late. The server has
 *              already re-sent a fresh link, so the message is "check your
 *              inbox again", never a dead end.
 *   unknown    a bad or spent token. Offer a human, not an error code.
 */
const OUTCOMES: Record<
  ConfirmOutcome,
  { title: string; body: string; tone: 'success' | 'info' | 'warning' | 'error' }
> = {
  confirmed: {
    title: "You're subscribed",
    body: 'Thanks for confirming. You will start receiving our updates, and you can change your mind at any time from the link at the bottom of any email.',
    tone: 'success',
  },
  already: {
    title: 'Already confirmed',
    body: 'This subscription was confirmed earlier, so there is nothing more to do.',
    tone: 'info',
  },
  expired: {
    title: 'That link had expired',
    body: 'We have sent a fresh confirmation email to the same address — please open that one instead. Confirmation links last seven days.',
    tone: 'warning',
  },
  unknown: {
    title: 'We could not confirm this link',
    body: 'It may have already been used, or it may have been copied incompletely from your email. Try clicking the link in the email again.',
    tone: 'error',
  },
  error: {
    title: 'Something went wrong',
    body: 'We could not reach our servers just now. Please try the link again in a moment.',
    tone: 'error',
  },
};

export default function ConfirmPanel() {
  const { loading, result } = useSubscriptionConfirm();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const outcome = OUTCOMES[result?.outcome ?? 'error'];

  return (
    <Stack spacing={3} alignItems="center" textAlign="center">
      {result?.outcome === 'confirmed' && (
        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 56 }} />
      )}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {outcome.title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {outcome.body}
        </Typography>
      </Box>

      {(result?.outcome === 'unknown' || result?.outcome === 'error') && (
        <Alert severity="info" sx={{ width: '100%', textAlign: 'left' }}>
          Still stuck? Email <Link href={`mailto:${CONTACT.email}`}>{CONTACT.email}</Link> and we
          will sort it out.
        </Alert>
      )}

      <Button component={NextLink} href="/" variant="contained">
        Back to Sinnapi
      </Button>
    </Stack>
  );
}
