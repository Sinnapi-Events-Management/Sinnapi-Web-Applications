'use client';
import type { ReactNode } from 'react';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import { ActionNote } from '../molecules/ActionNote';
import { SettlementDeadline } from '../molecules/SettlementDeadline';
import { SettlementFigures } from '../molecules/SettlementFigures';
import { SettlementTrail } from '../molecules/SettlementTrail';
import {
  settlementConsentNote,
  settlementHeadline,
  type SettlementEventShape,
  type SettlementRequestShape,
  type SettlementViewer,
} from '../molecules/settlement';

export type SettlementPanelProps = {
  request: SettlementRequestShape;
  viewer: SettlementViewer;
  events: SettlementEventShape[];
  isEventsLoading?: boolean;
  eventsError?: unknown;
  formatTimestamp: (value: string) => string;
  /** The buttons this portal offers. Everything above them is identical. */
  actions?: ReactNode;
  onNudge?: () => void;
  isNudging?: boolean;
  nudgeCooldownMinutes?: number;
};

/**
 * One settlement, rendered the same way for the vendor, the client and the
 * console.
 *
 * The three portals differ in exactly one place — the buttons at the bottom,
 * because only one party can act at a time. Everything above them is shared on
 * purpose: the figure being paid, what was withheld, who consented to it and
 * when, and the trail of how it got there. If the client's screen and the
 * vendor's screen could disagree about any of that, the consent this flow
 * collects would not be worth having.
 *
 * The reasons are quoted, never paraphrased. A vendor being asked to accept
 * less is entitled to the client's own words, and an admin mediating later
 * needs to see what each side actually said rather than a summary written by
 * whoever built the screen.
 */
export function SettlementPanel({
  request,
  viewer,
  events,
  isEventsLoading,
  eventsError,
  formatTimestamp,
  actions,
  onNudge,
  isNudging,
  nudgeCooldownMinutes,
}: SettlementPanelProps) {
  const headline = settlementHeadline(request, viewer);
  const consentNote = settlementConsentNote(request);
  const isContested = request.status === 'contested';

  return (
    <Stack spacing={2}>
      <Alert
        severity={isContested ? 'warning' : request.status === 'released' ? 'success' : 'info'}
        variant="outlined"
      >
        {headline}
      </Alert>

      <SettlementFigures request={request} viewer={viewer} />

      {/* The client's reason, in their words. Shown to every side: the vendor
          has to answer it, and the admin has to weigh it. */}
      {request.decision_reason && (
        <Quote label="The client's reason" text={request.decision_reason} />
      )}

      {/* The vendor's answer, likewise — accepted with a comment or contested
          with a case. */}
      {request.vendor_response_note && (
        <Quote
          label={request.vendor_response === 'contested' ? "The vendor's objection" : 'The vendor'}
          text={request.vendor_response_note}
        />
      )}

      {request.vendor_note && !request.decision_reason && (
        <Quote label="The vendor" text={request.vendor_note} />
      )}

      {consentNote && <ActionNote icon={<GavelIcon />}>{consentNote}</ActionNote>}

      <SettlementDeadline
        request={request}
        viewer={viewer}
        onNudge={onNudge}
        isNudging={isNudging}
        nudgeCooldownMinutes={nudgeCooldownMinutes}
      />

      {actions}

      {events.length > 0 && (
        <>
          <Divider />
          <Typography variant="overline" color="text.secondary">
            History
          </Typography>
          <SettlementTrail
            events={events}
            currency={request.currency ?? 'UGX'}
            formatTimestamp={formatTimestamp}
            isLoading={isEventsLoading}
            error={eventsError}
          />
        </>
      )}
    </Stack>
  );
}

function Quote({ label, text }: { label: string; text: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ pl: 1.5, borderLeft: '3px solid', borderColor: 'divider', fontStyle: 'italic' }}
      >
        {text}
      </Typography>
    </Stack>
  );
}
