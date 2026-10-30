'use client';
import { Avatar, Box, Stack, Typography, alpha } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { formatDay } from '../../molecules/datetime';

export type VendorReplyNoteProps = {
  /** The reply itself. Nothing renders when it is empty. */
  body: string | null | undefined;
  /** The vendor's own name. "The vendor replied" is the fallback, not the norm. */
  vendorName?: string | null;
  /** When they replied — their edit date if they have since changed it. */
  repliedAt?: string | null;
  /** Their logo, where the surface has it. */
  vendorAvatar?: string | null;
  /** Sits under the reply, for the rule the reply brings with it. */
  footnote?: string | null;
};

/**
 * The vendor's answer to a review, wherever a review is shown.
 *
 * ONE RENDERER, THREE SURFACES. The reply was drawn separately in the profile's
 * review list and in the client's own ratings list, and not at all on the
 * booking — where the client was told "the vendor replied, so your rating is
 * final" and then shown nothing of what the vendor had said. A client who
 * wanted to read the answer to their own review had to leave the booking and go
 * looking for it on the vendor's profile, which is the same complaint this
 * whole rework started from.
 *
 * THE SHAPE IS THE CONVENTION, NOT AN INVENTION. A reply reads as a second
 * voice only if it is separated from the review it answers: indented under it,
 * on its own tinted surface, labelled with who is speaking — which is what
 * Airbnb (host photo, name, "Host" label), Google and the review-widget tools
 * all settle on. We tint from the accent rather than filling with a fixed grey
 * so the quote stays a soft wash on the light canvas and on the warm dark one
 * instead of a block that only suits one of them, and it matches the vendor
 * portal's own view of the same reply.
 *
 * THE DATE IS NOT DECORATION. A reply two days after the event and a reply four
 * months later are different answers to the same review, and the client is the
 * person best placed to notice which they got.
 */
export function VendorReplyNote({
  body,
  vendorName,
  repliedAt,
  vendorAvatar,
  footnote,
}: VendorReplyNoteProps) {
  // The reply row can exist with nothing in it — a heading over blank space
  // would tell the client they had been answered when they had not.
  if (!body?.trim()) return null;

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        borderLeft: 3,
        borderColor: 'secondary.main',
        bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.07),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
        <Avatar
          src={vendorAvatar ?? undefined}
          alt=""
          sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}
        >
          <StorefrontIcon sx={{ fontSize: 14 }} />
        </Avatar>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {vendorName ? `${vendorName} replied` : 'The vendor replied'}
        </Typography>
        {repliedAt && (
          <Typography variant="caption" color="text.secondary">
            · {formatDay(repliedAt)}
          </Typography>
        )}
      </Stack>

      {/* `pre-line` so the paragraphs the vendor typed survive — the same
          treatment the review above it gets, for the same reason. */}
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
        {body}
      </Typography>

      {footnote && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {footnote}
        </Typography>
      )}
    </Box>
  );
}
