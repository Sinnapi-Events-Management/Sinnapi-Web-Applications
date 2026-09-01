import { Stack, Typography } from '@sinnapi/ui';
import ExpressInterestButton from '@/components/events/ExpressInterestButton';

type EventCardActionsProps = {
  eventId: string;
  /** Client-posted events accept an expression of interest; admin ones don't. */
  actionable: boolean;
  interested: boolean;
};

/** Holds both variants to the same height so action rows line up across the grid. */
const ROW_MIN_HEIGHT = 40;

/**
 * The card's one action.
 *
 * `position: relative` with a `zIndex` above the title's stretched-link overlay
 * is what keeps the button pressable: the whole card is a link to the event
 * page, and without this the click would navigate instead of firing. It is the
 * same trick the client portal's card uses for its payment-terms button, and
 * the reason the card is a stretched link rather than a `CardActionArea` — a
 * button nested inside an anchor is invalid HTML that assistive technology
 * reports inconsistently.
 *
 * Admin-sourced events take no interest, so the row says so in place of the
 * button rather than showing a disabled control a vendor would keep pressing.
 * Both variants sit at the same height: a grid where some cards end in a 36px
 * button and others in a 16px caption has a ragged baseline, which is exactly
 * the row-scanning cue this layout depends on.
 */
export default function EventCardActions({
  eventId,
  actionable,
  interested,
}: EventCardActionsProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      sx={{ position: 'relative', zIndex: 1, minHeight: ROW_MIN_HEIGHT }}
    >
      {actionable ? (
        <ExpressInterestButton eventId={eventId} already={interested} />
      ) : (
        <Typography variant="caption" color="text.secondary">
          Inspiration only — not open to quotes
        </Typography>
      )}
    </Stack>
  );
}
