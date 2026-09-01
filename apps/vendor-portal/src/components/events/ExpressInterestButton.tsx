import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, CircularProgress, Snackbar, rpcErrorMessage } from '@sinnapi/ui';
import CheckIcon from '@mui/icons-material/Check';
import { supabase } from '@/lib/supabase';

/**
 * What each of `express_event_interest`'s refusals means to a vendor.
 *
 * `vendor_category_mismatch` is the one this table was written for. It is
 * deliberately a different token from `vendor_not_eligible`, and the copy keeps
 * them apart: one means "this is not your line of work", the other means "your
 * account or subscription is not in good standing". A vendor shown the wrong
 * one of those goes to check their billing over a category mismatch, or adds a
 * service to fix an expired subscription.
 *
 * The event page withholds the control rather than letting a vendor reach these
 * — it knows the plan and can mirror the rule. The FEED cannot: it lists a
 * hundred events and loading every plan to grey out a button would be a hundred
 * requests for a refusal most vendors will never hit. So there the button is
 * offered and the server's answer is explained, which is why this table has to
 * be complete rather than just cover the new token.
 */
const EXPRESS_INTEREST_ERRORS: Record<string, string> = {
  vendor_category_mismatch:
    'This event needs services you do not offer. Add the service to your profile and you can ' +
    'quote for events like this.',
  requirement_closed: 'That part of the event has already been booked with another vendor.',
  vendor_not_eligible:
    'Your account cannot take new work right now. Check that your subscription is active.',
  not_a_vendor: 'Only an approved vendor can express interest in an event.',
  event_unavailable: 'This event is no longer open to vendors.',
  event_past: 'This event has already happened.',
  own_event: 'This is your own event.',
  requirement_not_found: "That part of the event is no longer on the client's plan.",
  not_found: 'This event is no longer available.',
};

type ExpressInterestButtonProps = {
  eventId: string;
  /** Whether this vendor's interest is already on record. */
  already: boolean;
  /**
   * The budget line this is a hand up for, when the vendor is answering one
   * rather than the event as a whole.
   *
   * `express_event_interest` passes it to `open_event_quotation`, which keys
   * the quote on (event, vendor, client, LINE) — so a caterer who also does the
   * cake gets two quotes rather than one that silently moves between lines.
   */
  requirementId?: string | null;
  /** Overrides the copy where the surrounding context already says "interest". */
  label?: string;
  doneLabel?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'text' | 'outlined' | 'contained';
};

/**
 * Puts a vendor's hand up for a public event — and takes them straight to the
 * quote they now have to write.
 *
 * WHAT THIS USED TO DO, AND WHY IT WAS A DEAD END
 * It inserted a bare `event_interests` row and stopped. That row was visible to
 * admins and to nobody else: the client — the person the interest is addressed
 * to — was never told, had no screen that showed it, and had no way to answer.
 * Meanwhile the vendor could not price anything either, because `send_quotation`
 * needs a `quotations` row and only a client could create one. So a vendor
 * expressed interest into silence and then waited for a request that had no way
 * to arrive.
 *
 * `express_event_interest` (0901d) records the interest AND opens the draft
 * quotation in one call, which is why this navigates: the button's whole
 * purpose is to get the vendor to the builder with the client's brief in front
 * of them. Abandoning that draft is fine — the interest still stands as
 * "interested, no price yet", and the client can chase it.
 *
 * The vendor is no longer a prop. The RPC derives it from the caller, which is
 * the only value it could correctly be — a passed one is a value that can
 * eventually be passed wrong.
 *
 * "Already sent" stays derived from `already || sent` rather than copied into
 * state on mount: `already` comes from the interests query, which on a cold
 * cache resolves after the feed does, so a seeded flag would paint every card
 * as un-sent and never look again.
 */
export default function ExpressInterestButton({
  eventId,
  already,
  requirementId = null,
  label = 'Express interest',
  doneLabel = 'Interest sent',
  fullWidth = false,
  size = 'small',
  variant = 'contained',
}: ExpressInterestButtonProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = already || sent;
  const ariaSubject = requirementId ? ' for this line' : ' for this event';

  async function express() {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('express_event_interest', {
      p_event_id: eventId,
      p_message: null,
      p_requirement_id: requirementId,
    });
    setBusy(false);

    if (rpcError) {
      // Read through the shared mapper WITH the token table: without it, every
      // one of these lands in the mapper's unmapped-guard branch and the vendor
      // is shown "Something went wrong" for a refusal that has a specific,
      // actionable reason. That was the behaviour until the gate went in.
      setError(rpcErrorMessage(rpcError, EXPRESS_INTEREST_ERRORS));
      return;
    }

    setSent(true);
    queryClient.invalidateQueries({ queryKey: ['v-interests'] });
    queryClient.invalidateQueries({ queryKey: ['v-quotations'] });
    // The event page lists this vendor's quotes for the event and counts them
    // on its tab bar; without this the quote just opened would not appear there
    // when the vendor came back.
    queryClient.invalidateQueries({ queryKey: ['v-event-quotations'] });

    // The RPC returns the quotation it opened. Following it is the point.
    if (data) navigate(`/quotations/${data as string}`);
  }

  return (
    <>
      <Button
        size={size}
        fullWidth={fullWidth}
        variant={done ? 'outlined' : variant}
        disabled={busy || done}
        onClick={express}
        startIcon={
          busy ? <CircularProgress size={15} color="inherit" /> : done ? <CheckIcon /> : null
        }
        // A disabled button reports nothing about *why*. The sent state is a
        // success, not an unavailable control, so it says so out loud — and it
        // names what it was sent about, because a line-scoped button sits in a
        // list of them and "already sent" alone says which one.
        aria-label={
          done
            ? `${doneLabel} — already on record${ariaSubject}`
            : `${label} and start a quote${ariaSubject}`
        }
        sx={{ whiteSpace: 'nowrap' }}
      >
        {busy ? 'Opening…' : done ? doneLabel : label}
      </Button>

      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}
