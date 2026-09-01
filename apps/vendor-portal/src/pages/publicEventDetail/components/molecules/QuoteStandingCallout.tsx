import { Stack, Typography } from '@sinnapi/ui';
import type { QuoteStanding } from '../../schema';
import QuoteActionButton from './QuoteActionButton';

type Props = {
  eventId: string;
  standing: QuoteStanding;
  /** Client-posted events accept an expression of interest; admin ones don't. */
  actionable: boolean;
  interested: boolean;
  /**
   * Whether anything on this event is in the vendor's line of work — the
   * browser's copy of the event-wide branch of `express_event_interest`.
   */
  canExpressInterest: boolean;
};

/**
 * Where the vendor stands, and the one control that moves it on.
 *
 * The whole reason this page has a Quote tab. `express_event_interest` opens a
 * DRAFT quotation and returns it, so a vendor who put their hand up and then
 * closed the tab has a real quote sitting in `/quotations` that the client
 * cannot see and that nothing will ever chase. From the feed that state is
 * indistinguishable from having quoted — the card says "Interest sent" either
 * way. Here it is named, and the button goes to the builder rather than opening
 * a second quote.
 *
 * Which control renders is the standing's decision, not this component's:
 * with no quote yet the only thing that can be done is express interest (the
 * shared button, so the RPC call and its error handling exist once), and with a
 * quote in play the action is always a link to the builder that already holds
 * the vendor's lines.
 *
 * A quote the vendor ALREADY HOLDS is always reachable, even where
 * `canExpressInterest` is false. The gate is about starting new work, not about
 * locking someone out of a quotation they wrote — a client may have narrowed
 * their plan after inviting them, and burying the vendor's own draft behind
 * that would be a data-loss bug wearing a permission's clothes.
 */
export default function QuoteStandingCallout({
  eventId,
  standing,
  actionable,
  interested,
  canExpressInterest,
}: Props) {
  const blocked = actionable && !canExpressInterest && !standing.quotation;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
    >
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {blocked ? 'Nothing here is in your line of work' : standing.label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {blocked
            ? 'Every open line on this plan is filed under a service you do not offer. Add the ' +
              'service to your profile and this event opens up.'
            : standing.detail}
        </Typography>
      </Stack>

      {/* Admin-posted briefs are inspiration: the RPC refuses them, so no
          control is offered rather than one that is offered and then rejected.
          The hero's "Inspiration only" chip is what explains the absence. */}
      {actionable && !blocked && (
        <QuoteActionButton
          eventId={eventId}
          standing={standing}
          interested={interested}
          size="medium"
        />
      )}
    </Stack>
  );
}
