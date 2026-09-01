import { Box, Chip, Stack, Typography, formatAmount } from '@sinnapi/ui';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';

type Props = {
  currency: string;
  lockedSubtotal: number | null;
  lockedFloor: number | null;
  eventDate: string | null;
  eventTypeName: string | null;
  eventAddress: string | null;
};

/**
 * What the vendor cannot change here, said before they look for the controls.
 *
 * Every other quote screen in this portal is a builder. A vendor arriving at
 * this one and finding no line-item rows will assume something failed to load
 * unless the page says, up front, that the absence is the point. Stating the
 * constraint is cheaper than a support thread about a missing form.
 *
 * Framed as facts about the order rather than as prohibitions — "the client
 * ordered this at UGX X" is the same rule as "you may not change the price",
 * and it does not read as the platform distrusting the vendor.
 */
export default function PackageOrderLocks({
  currency,
  lockedSubtotal,
  lockedFloor,
  eventDate,
  eventTypeName,
  eventAddress,
}: Props) {
  return (
    <Stack spacing={1.5}>
      {/* The date and the place, together and first. They are what the vendor
          is actually agreeing to — the price is already settled — so they lead
          rather than sitting in the Overview tab a click away.

          The address is a chip like the date rather than prose: it is a fact to
          be checked against a calendar and a map, not read. `wrap` on the label
          because a real address is longer than a date and truncating the street
          out of one would defeat the point of showing it. */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          variant="outlined"
          icon={<EventOutlinedIcon />}
          label={
            eventDate
              ? `${formatEventDate(eventDate)}${eventTypeName ? ` · ${eventTypeName}` : ''}`
              : (eventTypeName ?? 'Date not set')
          }
        />
        {eventAddress && (
          <Chip
            size="small"
            variant="outlined"
            icon={<PlaceOutlinedIcon />}
            label={eventAddress}
            sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
          />
        )}
      </Stack>

      <Fact
        icon={<LockOutlinedIcon fontSize="small" />}
        title="The scope and the price are fixed"
        body={
          lockedSubtotal != null
            ? `The client ordered this package as published, at ${formatAmount(lockedSubtotal, currency)} before discounts. The included services and that figure cannot be changed on this order.`
            : 'The client ordered this package as published. Its services and price cannot be changed on this order.'
        }
      />

      <Fact
        icon={<TrendingDownIcon fontSize="small" />}
        title="You can increase the saving, not reduce it"
        body={
          lockedFloor != null
            ? `They ordered with ${formatAmount(lockedFloor, currency)} off. Approving with a bigger discount is fine; anything smaller is refused.`
            : 'Approving with a bigger discount is fine; anything smaller than the one they ordered with is refused.'
        }
      />
    </Stack>
  );
}

function Fact({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0, display: 'flex' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </Box>
    </Stack>
  );
}

/** `13 Sep 2026` — a date a vendor checks against a calendar, not an ISO string. */
function formatEventDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
