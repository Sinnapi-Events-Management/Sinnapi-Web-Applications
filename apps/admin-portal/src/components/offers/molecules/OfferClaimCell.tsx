import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import { OfferSavingBadge } from '@sinnapi/ui/offers';
import type { AdminOfferModel } from '@/lib/types';

/**
 * What the offer claims, and what the vendor is calling it.
 *
 * The badge and the name together in one cell rather than two columns, because
 * an operator scanning this table is asking one question — "is this claim
 * reasonable" — and a 70% badge beside a name like "Closing down sale" is a
 * different row from the same badge beside "Gold tier only". Splitting them
 * across columns puts a sort order between two halves of one thought.
 *
 * The same `OfferSavingBadge` a client sees. That is deliberate and it is the
 * point of the component being shared: an operator deciding whether to take
 * something down should be looking at exactly what the public is looking at,
 * not at a normalised admin rendering of it.
 */
export default function OfferClaimCell({ offer }: { offer: AdminOfferModel }) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0, py: 0.5 }}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <OfferSavingBadge offer={{ ...offer, discount_id: offer.discount_id }} />
        {offer.code && (
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'text.secondary',
            }}
          >
            {offer.code}
          </Typography>
        )}
      </Stack>

      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {offer.title}
      </Typography>

      {offer.promotion_title && (
        <Tooltip title={`Campaign ${offer.promotion_public_id ?? ''}`.trim()}>
          <Typography variant="caption" color="text.secondary" noWrap>
            Campaign: {offer.promotion_title}
          </Typography>
        </Tooltip>
      )}
    </Stack>
  );
}
