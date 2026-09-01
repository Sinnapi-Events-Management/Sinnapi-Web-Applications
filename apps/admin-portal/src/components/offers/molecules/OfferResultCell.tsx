import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { AdminOfferModel } from '@/lib/types';

/**
 * What the offer has actually returned.
 *
 * Redeemed on top, reserved beneath, and the two are genuinely different
 * numbers: a reservation is a quote a vendor has sent under this offer that the
 * client has not answered, and it holds a use against the cap without having
 * sold anything. An offer with forty reservations and two redemptions is a
 * vendor quoting freely and closing nothing — which is the shape of a campaign
 * being used to lowball, and the reason this console can see it at all.
 *
 * The money is what was GIVEN AWAY, not what was booked. An operator asking
 * whether a claim is sustainable wants the cost of the campaign, and the
 * booking value is a different question the settlements screens already answer.
 */
export default function OfferResultCell({ offer }: { offer: AdminOfferModel }) {
  const redeemed = offer.redeemed_count ?? 0;
  const reserved = offer.reserved_count ?? 0;

  if (redeemed === 0 && reserved === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Stack spacing={0.25}>
      <Tooltip title="Quotes accepted under this offer">
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {redeemed} claimed · {formatMoney(offer.discounted_value ?? 0, offer.currency ?? 'UGX')}
        </Typography>
      </Tooltip>
      {reserved > 0 && (
        <Tooltip title="Quotes sent under this offer that the client has not answered. These hold a use against the cap.">
          <Typography variant="caption" color="text.secondary">
            {reserved} held
          </Typography>
        </Tooltip>
      )}
    </Stack>
  );
}
