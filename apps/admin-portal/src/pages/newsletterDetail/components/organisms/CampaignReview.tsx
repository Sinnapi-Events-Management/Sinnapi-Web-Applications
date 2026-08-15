import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  SectionCard,
  Stack,
  TextField,
  Typography,
} from '@sinnapi/ui';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SendIcon from '@mui/icons-material/Send';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
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
  onSchedule: (when: Date | null) => void;
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
  onSchedule,
}: Props) {
  const [when, setWhen] = useState('');
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

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
          >
            <TextField
              size="small"
              type="datetime-local"
              label="Schedule for"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={!ready || queued === 0}
              sx={{ minWidth: 240 }}
            />
            <Button
              variant="outlined"
              startIcon={<ScheduleSendIcon />}
              disabled={!ready || queued === 0 || !when || busy === 'queue'}
              // `datetime-local` yields a naive local string; `new Date` reads
              // it in the browser's zone, which is the zone the operator typed
              // it in. The RPC stores the resulting instant.
              onClick={() => onSchedule(new Date(when))}
            >
              Schedule
            </Button>
          </Stack>

          <Divider />

          <Box>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              startIcon={<SendIcon />}
              disabled={!ready || queued === 0 || busy === 'queue'}
              onClick={() => setConfirming(true)}
            >
              Send now to {queued.toLocaleString()}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      <ConfirmDialog
        open={confirming}
        title="Send this newsletter?"
        description={
          `This will email ${queued.toLocaleString()} ${queued === 1 ? 'person' : 'people'} ` +
          `within the next few minutes. It cannot be recalled or edited once it starts.`
        }
        confirmLabel="Send now"
        loading={busy === 'queue'}
        onConfirm={() => {
          setConfirming(false);
          onSchedule(null);
        }}
        onCancel={() => setConfirming(false)}
      />
    </Stack>
  );
}
