import { Stack, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import { discountCountdown, type DiscountRow } from '../../schema';

/**
 * When a code can be redeemed, and how long is left of that.
 *
 * The dates answer "what did I set", the countdown answers "what do I have
 * left" — different questions, and a vendor deciding whether to extend an offer
 * is asking the second one. Green only while the code is actually redeemable,
 * so the one colour on the line always means the same thing.
 *
 * No progress bar here, unlike the campaign card this otherwise mirrors: the
 * bar on a discount card is spent for the redemption count, which is the
 * scarcer resource and the one a vendor acts on. Two bars per card would make
 * neither of them read.
 */
export default function DiscountWindow({ discount, now }: { discount: DiscountRow; now: number }) {
  const countdown = discountCountdown(discount, now);

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
        {formatDate(discount.starts_at)} – {formatDate(discount.ends_at)}
      </Typography>
      {countdown && (
        <Typography
          variant="caption"
          sx={{
            flexShrink: 0,
            fontWeight: 600,
            color: discount.status === 'live' ? 'success.main' : 'text.secondary',
          }}
        >
          {countdown}
        </Typography>
      )}
    </Stack>
  );
}
