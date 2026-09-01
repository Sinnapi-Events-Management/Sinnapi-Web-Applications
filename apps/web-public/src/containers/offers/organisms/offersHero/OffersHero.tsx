import Image from 'next/image';
import { Box, Container, Typography } from '@sinnapi/ui/atoms';
import { common, withAlpha } from '@sinnapi/ui/tokens';
import { IMAGES } from '@/lib/assets';

type Props = {
  /** How many offers are live right now — the one number that earns the click. */
  total: number;
};

/**
 * The offers hero.
 *
 * A SERVER COMPONENT WITH NO ISLANDS
 * The vendors hero ships two — a search pill and quick filters — because
 * discovery there is exploratory. This page is not explored, it is scanned:
 * a visitor arrives from a search result, reads what is on offer, and clicks a
 * vendor. Every filter on the page is a link, so nothing here needs JavaScript
 * and the LCP is not gated behind any.
 *
 * The count is in the headline rather than under it. "23 live offers" is the
 * whole proposition of this page, and a number that has to be true is a number
 * worth putting where it cannot be missed — it comes from the same query that
 * renders the grid, so it can never claim more than the page shows.
 *
 * The deadline sentence is the second line for the same reason it is anywhere
 * else in this feature: an offer without a stated end is a discount, and a
 * discount with no urgency is just a lower price nobody hurries for.
 */
export default function OffersHero({ total }: Props) {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: 'common.white',
        backgroundColor: 'primary.dark',
        pt: { xs: 7, md: 10 },
        pb: { xs: 7, md: 10 },
      }}
    >
      {/* Decorative → empty alt + aria-hidden, like every other hero here. */}
      <Image
        src={IMAGES.ceremonyAisle.src}
        alt=""
        aria-hidden
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          // Deeper at the bottom, where the text sits: a flat scrim either
          // washes out the photograph or leaves the headline short of contrast.
          background: `linear-gradient(180deg, ${withAlpha(common.black, 0.35)} 0%, ${withAlpha(
            common.black,
            0.72,
          )} 100%)`,
        }}
      />

      <Container sx={{ position: 'relative' }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.18em', opacity: 0.85, display: 'block', mb: 1 }}
        >
          Offers
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, maxWidth: '18ch', lineHeight: 1.1 }}>
          {total > 0 ? `${total} live ${total === 1 ? 'offer' : 'offers'}` : 'Offers on Sinnapi'}
        </Typography>
        <Typography sx={{ mt: 2, maxWidth: '58ch', opacity: 0.9, lineHeight: 1.7 }}>
          Real savings on real packages from verified vendors. Every offer here ends on a date and
          every price is the vendor&rsquo;s own — sign in to claim one and it comes back as a quote
          you can accept.
        </Typography>
      </Container>
    </Box>
  );
}
