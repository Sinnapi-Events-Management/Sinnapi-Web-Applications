import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import type { DiscountRow } from '../../schema';

/**
 * What this code is actually an offer on.
 *
 * The single most important line added to this card, because before offers had
 * targets the honest answer was "nothing" — a vendor could publish 20% off and
 * the platform could not say twenty percent off what, so no client surface
 * could show it and no quote could apply it.
 *
 * Two visual states, and the difference is the whole point. A scoped code names
 * the packages it covers. An unscoped one gets the globe and the warning tint:
 * it applies to the vendor's entire catalogue, which is legal, occasionally
 * intended, and much more often a vendor who did not realise the picker was
 * there. Rendering both as the same grey line is what would let that mistake
 * stay invisible until the month's revenue came in.
 *
 * Inherited coverage is labelled rather than hidden. A code with no targets of
 * its own takes its campaign's — that is the database's rule and it is usually
 * what the vendor wants — but a vendor looking at this card needs to know
 * whether editing THIS code will change what it covers, or whether they have to
 * go to the campaign.
 */
export default function DiscountCoverage({ discount }: { discount: DiscountRow }) {
  const unscoped = discount.coverage === 'Everything you sell';

  return (
    <Tooltip
      title={
        unscoped
          ? 'This code has no packages attached, so it discounts everything you sell. Edit it to narrow the scope.'
          : discount.coverageInherited
            ? `Inherited from the ${discount.promotionTitle ?? 'campaign'} campaign. Change it there, or attach packages to this code to override.`
            : 'The packages and tiers clients get this saving on.'
      }
    >
      <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
        {unscoped ? (
          <PublicOutlinedIcon sx={{ fontSize: 16, color: 'warning.main', mt: '2px' }} />
        ) : (
          <SellOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', mt: '2px' }} />
        )}
        <Typography
          variant="caption"
          color={unscoped ? 'warning.main' : 'text.secondary'}
          sx={{
            minWidth: 0,
            // Two lines, then ellipsis. A vendor with six packages ticked would
            // otherwise push every card in the row out of alignment with its
            // neighbours — the tooltip carries the rest.
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {discount.coverage}
          {discount.coverageInherited && ' — via the campaign'}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
