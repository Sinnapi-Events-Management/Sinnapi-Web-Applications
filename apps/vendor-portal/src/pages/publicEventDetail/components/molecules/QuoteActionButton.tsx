import { Button } from '@sinnapi/ui';
import { Link as RouterLink } from 'react-router-dom';
import ExpressInterestButton from '@/components/events/ExpressInterestButton';
import type { QuoteStanding } from '../../schema';

type Props = {
  eventId: string;
  /** Where the vendor stands — on the event, or on one line of it. */
  standing: QuoteStanding;
  /** Scopes a fresh quote to one plan line. Null quotes the event as a whole. */
  requirementId?: string | null;
  /** Whether this vendor's interest is already on record for the event. */
  interested: boolean;
  size?: 'small' | 'medium';
  /** Copy for the "nothing yet" case, where the surrounding context varies. */
  startLabel?: string;
};

/**
 * The single control that moves a vendor's quote forward, wherever it appears.
 *
 * One component because there is one rule, and it has to hold in three places
 * (the Quote tab's callout, each plan line, and anywhere added later): if a
 * quote already exists, the action is to OPEN it — never to start another.
 * `express_event_interest` is idempotent and would hand back the same row, but
 * a button offering to "express interest" beside a quote the vendor has already
 * written reads as a second, competing bid.
 *
 * Only the "nothing yet" branch calls the RPC, and it does so through the same
 * shared `ExpressInterestButton` the feed uses — so the call, its error mapping
 * and the navigation into the builder exist exactly once.
 */
export default function QuoteActionButton({
  eventId,
  standing,
  requirementId = null,
  interested,
  size = 'small',
  startLabel,
}: Props) {
  if (standing.quotation) {
    return (
      <Button
        component={RouterLink}
        to={`/quotations/${standing.quotation.id}`}
        size={size}
        // Only the unsent case is the vendor's outstanding move, so it is the
        // only one that spends a filled button. The rest are ways in, not
        // prompts.
        variant={standing.key === 'unsent' ? 'contained' : 'outlined'}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        {standing.ctaLabel}
      </Button>
    );
  }

  return (
    <ExpressInterestButton
      eventId={eventId}
      requirementId={requirementId}
      already={requirementId ? false : interested}
      size={size}
      {...(startLabel && { label: startLabel })}
    />
  );
}
