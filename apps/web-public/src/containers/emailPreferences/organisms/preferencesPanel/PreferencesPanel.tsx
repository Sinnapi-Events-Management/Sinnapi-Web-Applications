'use client';
import { Box, Button, CircularProgress, Divider, Stack, Typography, Link } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import NextLink from 'next/link';
import { CONTACT } from '@sinnapi/utils';
import { useEmailPreferences } from '../../hooks/useEmailPreferences';
import { TOPICS } from '../../data/topics';
import TopicSwitch from '../../molecules/TopicSwitch';

/**
 * The preference centre itself.
 *
 * ── Why topics, and not just an "unsubscribe" button ──────────────────────
 * Somebody who no longer wants vendor business tips has not asked to stop
 * hearing about anything at all. Offering the narrower choice first keeps a
 * relationship that a single all-or-nothing button would end, and it is also
 * the outcome the person usually actually wants. The full opt-out is still
 * here, unconditionally and one click away — it is placed second, not hidden.
 *
 * ── No login, no survey, no "are you sure" ────────────────────────────────
 * GDPR Art.7(3) requires withdrawal to be as easy as consent was, and every
 * extra step here converts opt-outs into spam complaints, which cost the
 * sending domain far more than the unsubscribe would have.
 */
export default function PreferencesPanel() {
  const { state, loading, busy, error, justUnsubscribedAll, setTopic, unsubscribeAll } =
    useEmailPreferences();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!state?.found) {
    return (
      <Alert severity="info">
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          This link is no longer valid
        </Typography>
        <Typography variant="body2">
          It may have come from a very old email, or the address may already have been removed.
          Email us at <Link href={`mailto:${CONTACT.email}`}>{CONTACT.email}</Link> and we will take
          care of it.
        </Typography>
      </Alert>
    );
  }

  const anySubscribed = state.topics.some((t) => t.subscribed);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Managing email preferences for
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {state.email}
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {justUnsubscribedAll && (
        <Alert severity="success">
          You have been unsubscribed. You will not receive any more marketing email from Sinnapi.
          Messages about your bookings and your account will still be sent — those are not
          marketing, and there is nothing to opt out of.
        </Alert>
      )}

      {state.suppressed && !justUnsubscribedAll && (
        <Alert severity="info">
          This address is currently not receiving any marketing email. Switch a topic on below to
          start again.
        </Alert>
      )}

      <Stack spacing={2}>
        {TOPICS.map((topic) => {
          const current = state.topics.find((t) => t.topic === topic.key);
          return (
            <TopicSwitch
              key={topic.key}
              topicKey={topic.key}
              label={topic.label}
              description={topic.description}
              subscribed={Boolean(current?.subscribed)}
              busy={busy === topic.key}
              onChange={(t, next) => void setTopic(t, next)}
            />
          );
        })}
      </Stack>

      <Divider />

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Would you rather hear nothing at all?
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          disabled={busy === 'all' || (!anySubscribed && state.suppressed)}
          onClick={() => void unsubscribeAll()}
        >
          {busy === 'all' ? 'Unsubscribing…' : 'Unsubscribe from everything'}
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Changes take effect immediately. See our{' '}
        <Link component={NextLink} href="/privacy">
          privacy policy
        </Link>{' '}
        for how we handle your data.
      </Typography>
    </Stack>
  );
}
