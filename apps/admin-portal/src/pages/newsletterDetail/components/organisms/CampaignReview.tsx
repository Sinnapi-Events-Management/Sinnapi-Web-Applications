import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  SectionCard,
  Stack,
  Typography,
} from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SendIcon from '@mui/icons-material/Send';
import { ConfirmDialog } from '@sinnapi/ui';
import TestSendField from '../molecules/TestSendField';
import QueueSummary from '../molecules/QueueSummary';
import type { NewsletterQueueResult } from '@/lib/types';

type Props = {
  issues: string[];
  audienceCount: number;
  canQueue: boolean;
  needsAttestation: boolean;
  attested: boolean;
  queueResult: NewsletterQueueResult | null;
  busy: string | null;
  myEmail?: string;
  onQueue: () => void;
  onSendTest: (email: string) => void;
  onSendNow: () => void;
};

/**
 * The last screen before customers see anything.
 *
 * ── Two deliberate steps, not one button ──────────────────────────────────
 * Confirming the audience and sending are separate actions because the first
 * one produces information the operator needs in order to make the second: the
 * exact number queued and the exact number excluded. A single "Send" that did
 * both would surface those counts only after the mail was already moving.
 *
 * ── Send now goes through a confirmation ──────────────────────────────────
 * This is the one irreversible action in the console. There is no recall, no
 * edit-after-send, and no way to un-deliver — so the dialog states the number
 * and the audience back rather than asking a generic "are you sure".
 */
export default function CampaignReview({
  issues,
  audienceCount,
  canQueue,
  needsAttestation,
  attested,
  queueResult,
  busy,
  myEmail,
  onQueue,
  onSendTest,
  onSendNow,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  const ready = issues.length === 0;
  const queued = queueResult?.queued ?? 0;

  return (
    <Stack spacing={3}>
      <SectionCard title="Before you send">
        {issues.length > 0 ? (
          <Alert severity="warning">
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Finish these first
            </Typography>
            <List dense disablePadding>
              {issues.map((issue) => (
                <ListItem key={issue} disableGutters sx={{ py: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <ErrorOutlineIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={issue} />
                </ListItem>
              ))}
            </List>
          </Alert>
        ) : (
          <Alert severity="success">The message is complete and ready to send.</Alert>
        )}

        <Box sx={{ mt: 2.5 }}>
          <TestSendField defaultEmail={myEmail} busy={busy === 'test'} onSend={onSendTest} />
        </Box>
      </SectionCard>

      <SectionCard title="Confirm the audience">
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {audienceCount.toLocaleString()} {audienceCount === 1 ? 'person is' : 'people are'}{' '}
            selected. Confirming freezes the list onto this campaign and filters out anyone who has
            unsubscribed, bounced or never consented.
          </Typography>

          {needsAttestation && !attested && (
            <Alert severity="warning">
              Tick the consent confirmation on the Audience step before you can continue.
            </Alert>
          )}

          <Box>
            <Button variant="outlined" disabled={!canQueue || busy === 'queue'} onClick={onQueue}>
              {busy === 'queue' ? 'Confirming…' : 'Confirm recipients'}
            </Button>
          </Box>

          {queueResult && <QueueSummary result={queueResult} />}
        </Stack>
      </SectionCard>

      <SectionCard title="Send">
        <Stack spacing={2}>
          {queued === 0 && (
            <Typography variant="body2" color="text.secondary">
              Confirm the recipients above to unlock sending.
            </Typography>
          )}

          {/*
            Scheduling is intentionally absent. It was a `datetime-local` field
            beside this button, writing `scheduled_at` for a pg_cron worker to
            pick up. That chain — pg_cron, pg_net, a Vault-stored service key,
            the function's own copy of that key — fails silently at every link,
            and the symptom is a campaign that sits in `scheduled` indefinitely
            while this screen reports nothing wrong.

            Sending inline is not the better engineering; it is the honest one
            while that path has no observability. An operator gets the result of
            the send as the response to their own click. Restore scheduling when
            a failed tick is something the product can actually show.
          */}
          <Box>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<SendIcon />}
              disabled={!ready || queued === 0 || busy === 'queue'}
              onClick={() => setConfirming(true)}
            >
              {busy === 'queue' ? 'Sending…' : `Send now to ${queued.toLocaleString()}`}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      <ConfirmDialog
        open={confirming}
        title="Send this newsletter?"
        description={
          `This will email ${queued.toLocaleString()} ${queued === 1 ? 'person' : 'people'} ` +
          `now. Keep this page open until it finishes. It cannot be recalled or edited ` +
          `once it starts.`
        }
        confirmLabel="Send now"
        loading={busy === 'queue'}
        onConfirm={() => {
          setConfirming(false);
          onSendNow();
        }}
        onCancel={() => setConfirming(false)}
      />
    </Stack>
  );
}
