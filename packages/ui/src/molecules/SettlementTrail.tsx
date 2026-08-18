'use client';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { formatAmount } from './money';
import type { SettlementEventShape } from './settlement';

export type SettlementTrailProps = {
  events: SettlementEventShape[];
  currency?: string;
  /** Each portal owns its own date formatting; see `StatusTimeline` for why. */
  formatTimestamp: (value: string) => string;
  isLoading?: boolean;
  error?: unknown;
};

/**
 * Everything that has happened on a settlement, shown identically to all three
 * parties.
 *
 * Not decoration. Half of what makes an agreed reduction defensible is that
 * nobody can quietly rewrite what was said — the amount offered, the reason
 * given, who chased whom, and whether a party was ever actually asked. The
 * table behind this is append-only for the same reason.
 *
 * Reminders are in the list with the decisions on purpose. "Nobody told me" is
 * the argument this flow exists to end, and a reminder that leaves no trace
 * settles nothing.
 */

/** Whose action it was, and what it did — one line, written for everyone. */
const KIND_COPY: Record<string, (actor: string) => string> = {
  requested: (a) => `${a} asked to be paid the amount being held`,
  forwarded: () => 'Sinnapi put the request to the client',
  nudged: (a) => `${a} sent a reminder`,
  decided: (a) => `${a} made a decision on the amount`,
  vendor_accepted: (a) => `${a} accepted the amount offered`,
  vendor_contested: (a) => `${a} contested the amount offered`,
  released: () => 'Sinnapi approved the agreed amount for payment',
  escalated: () => 'A deadline passed and the request was escalated',
  cancelled: (a) => `${a} withdrew the request`,
};

const ACTOR_NOUN: Record<string, string> = {
  vendor: 'The vendor',
  client: 'The client',
  admin: 'Sinnapi',
  system: 'Sinnapi',
};

export function SettlementTrail({
  events,
  currency = 'UGX',
  formatTimestamp,
  isLoading,
  error,
}: SettlementTrailProps) {
  if (isLoading) {
    return (
      <Stack spacing={1}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={22} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="text.secondary">
        The history of this request could not be loaded.
      </Typography>
    );
  }

  if (!events.length) return null;

  return (
    <Stack spacing={1.5}>
      {events.map((event) => {
        const actor = ACTOR_NOUN[event.actor_role] ?? 'Sinnapi';
        const line = KIND_COPY[event.kind]?.(actor) ?? `${actor} updated the request`;

        return (
          <Stack key={event.id} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 7,
                height: 7,
                mt: 0.9,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: 'secondary.main',
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">
                {line}
                {event.amount != null && event.kind === 'decided' && (
                  <> — {formatAmount(event.amount, currency)}</>
                )}
              </Typography>
              {event.note && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  “{event.note}”
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                {formatTimestamp(event.created_at)}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}
