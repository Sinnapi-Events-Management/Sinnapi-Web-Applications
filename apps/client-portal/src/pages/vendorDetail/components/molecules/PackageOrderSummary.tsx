import { Box, Chip, MoneyBreakdown, Stack, Typography } from '@sinnapi/ui';
import { offerHeadline, type OfferModel } from '@sinnapi/ui/offers';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';

type Props = {
  packageName: string;
  tierName: string;
  offer: OfferModel | null;
  pricing: {
    currency: string;
    base: number;
    discountRate: number;
    discount: number;
    offerSaving: number;
    taxRate: number;
    taxInclusive: boolean;
    offeredTax: number;
    offeredTotal: number;
  };
};

/**
 * What the client is agreeing to pay, before they agree to it.
 *
 * This exists because of what the button behind it now does. A quote REQUEST
 * can be vague about money — the vendor is going to price it, and the client
 * finds out afterwards. An ORDER cannot: the vendor's next action binds this
 * total, so the total has to be on screen at the moment of commitment, not one
 * page back on the card the client scrolled past.
 *
 * Itemised rather than a single figure, for the reason `MoneyBreakdown` exists
 * at all — and here specifically because there are TWO reductions with
 * different authors. The tier discount is the vendor's standing price; the
 * offer is a campaign the client claimed. A client who later asks "where did my
 * 20% go" is asking about the second line, and one merged "discount" row cannot
 * answer them.
 *
 * The figures are display arithmetic and none of them is sent — the server
 * reprices from the tier's own rows. If the two ever disagree the quotation
 * page shows the server's number, which is the correct outcome.
 */
export default function PackageOrderSummary({ packageName, tierName, offer, pricing }: Props) {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        // `action.hover` rather than a fixed grey: it is defined in both
        // palettes, so this reads as a raised panel in light mode and a
        // recessed one in dark without a second rule.
        bgcolor: 'action.hover',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap title={packageName}>
            {packageName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tierName} tier
          </Typography>
        </Box>
        {offer && (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            icon={<LocalOfferRoundedIcon />}
            label={offerHeadline(offer)}
            sx={{ flexShrink: 0 }}
          />
        )}
      </Stack>

      <MoneyBreakdown
        dense
        currency={pricing.currency}
        lines={[
          { label: 'Package price', amount: pricing.base },
          ...(pricing.discount > 0
            ? [
                {
                  label: `${tierName} tier discount (${pricing.discountRate}%)`,
                  amount: -pricing.discount,
                },
              ]
            : []),
          ...(pricing.offerSaving > 0
            ? [
                {
                  label: offer?.title ? `Offer — ${offer.title}` : 'Offer',
                  amount: -pricing.offerSaving,
                  hint: 'Applied when the vendor approves your order. Held for you until then.',
                },
              ]
            : []),
          ...(pricing.taxRate > 0
            ? [
                {
                  label: `Tax (${pricing.taxRate}%)`,
                  amount: pricing.offeredTax,
                  // An inclusive rate is already inside the lines above, so
                  // rendering it additively would show the client a total that
                  // does not add up from the rows they can see.
                  ...(pricing.taxInclusive
                    ? { muted: true, hint: 'Already included in the prices above.' }
                    : { additive: true }),
                },
              ]
            : []),
        ]}
        total={{ label: 'Total', amount: pricing.offeredTotal }}
        footnote={
          <>
            This is the price the vendor is asked to approve. They can lower it — by adding a
            discount of their own — but never raise it.
          </>
        }
      />
    </Box>
  );
}
