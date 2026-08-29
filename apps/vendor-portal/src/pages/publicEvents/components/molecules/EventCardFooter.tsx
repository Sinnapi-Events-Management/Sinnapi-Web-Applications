import { Box, Divider, Stack, Typography } from '@sinnapi/ui';
import ExpressInterestButton from '@/components/events/ExpressInterestButton';

type EventCardFooterProps = {
  eventId: string;
  vendorId: string;
  /** Formatted budget, or null when the brief doesn't quote one. */
  budget: string | null;
  /** Client-posted events accept an expression of interest; admin ones don't. */
  actionable: boolean;
  interested: boolean;
};

/** Holds both variants to the same height so footers line up across the grid. */
const FOOTER_MIN_HEIGHT = 68;

/**
 * The card's commitment line: what the brief is worth, and the one thing a
 * vendor can do about it.
 *
 * Budget lives here rather than among the meta icons because it is the value
 * anchor — the figure a vendor decides on — and pairing it with the action is
 * what makes the decision and the commitment a single glance. As a meta row it
 * was the third of three identical grey lines and carried no more weight than
 * the venue.
 *
 * Admin-sourced events take no interest, so the card says so in place of the
 * button rather than showing a disabled control a vendor would keep pressing.
 * Both variants sit in a footer of the same height: a grid where some cards end
 * in a 36px button and others in a 16px caption has a ragged baseline, which is
 * exactly the row-scanning cue this layout depends on.
 */
export default function EventCardFooter({
  eventId,
  vendorId,
  budget,
  actionable,
  interested,
}: EventCardFooterProps) {
  return (
    <>
      <Divider />
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2, minHeight: FOOTER_MIN_HEIGHT }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Budget
          </Typography>
          <Typography variant="body2" fontWeight={700} noWrap>
            {budget ?? 'Not stated'}
          </Typography>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          {actionable ? (
            <ExpressInterestButton eventId={eventId} vendorId={vendorId} already={interested} />
          ) : (
            <Typography variant="caption" color="text.secondary">
              Inspiration only
            </Typography>
          )}
        </Box>
      </Stack>
    </>
  );
}
