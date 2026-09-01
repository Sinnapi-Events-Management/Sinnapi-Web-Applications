'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { PackageScopeList } from '../molecules/PackageScopeList';
import { PricingModelChip } from '../molecules/PricingModelChip';
import { PackageTierTabs } from '../molecules/PackageTierTabs';
import { advanceTermsSummary } from '../molecules/quotationPricing';
import {
  defaultPackageTier,
  packageAddOns,
  packageTierPricing,
  packageTiers,
  type PackageTierLike,
  type QuotePackageLike,
} from '../molecules/packagePricing';
import { PackageTierBreakdown } from './PackageTierBreakdown';
import { OfferRibbon } from '../offers/molecules/OfferRibbon';
import { applicableOffers, applyOfferToTier, bestOffer } from '../offers/schema/offerPricing';
import type { OfferedTierPricing } from '../offers/schema/offerPricing';
import type { OfferModel } from '../offers/types';
import { formatAmount } from '../molecules/money';

export type PackageShowcaseProps = {
  pkg: QuotePackageLike;
  /**
   * The call to action, given the tier the reader is actually looking at.
   *
   * A render prop rather than a plain node because every caller's button needs
   * the selected tier — "Request this package" that ignores which tier was
   * chosen is worse than no button, and threading the id back out through a
   * callback would make each of the four call sites hold state it has no other
   * use for.
   */
  renderAction?: (
    tier: PackageTierLike,
    pricing: OfferedTierPricing,
    offer: OfferModel | null,
  ) => ReactNode;
  /**
   * Live offers that cover this package, from `package_offers`.
   *
   * Passed in rather than fetched, like every other row this kit renders: four
   * apps reach Supabase through four clients, and a showcase that fetched its
   * own offers could only work in the app it was written for.
   *
   * The showcase picks the best applicable one for the tier on screen — largest
   * saving, ties broken by the earlier deadline, which is the order
   * `best_automatic_discount` uses in SQL. Any other choice here would advertise
   * one saving and have the server apply another.
   */
  offers?: readonly OfferModel[];
  /**
   * Per-tier action for the offer ribbon — "Use this offer". Omitted where the
   * offer is not something the reader can act on separately from the package.
   */
  renderOfferAction?: (offer: OfferModel, tier: PackageTierLike) => ReactNode;
  /** Header slot on the right — a visibility chip, an overflow menu. */
  headerAction?: ReactNode;
  /** Which tier to open on. Defaults to the vendor's recommended one. */
  defaultTierId?: string | null;
  onTierChange?: (tierId: string) => void;
  /** `plain` drops the surface, for a showcase already inside a card. */
  variant?: 'card' | 'plain';
};

/**
 * A vendor's package, as every audience reads it.
 *
 * One renderer for four apps: the vendor previewing what they are about to
 * publish, the client browsing the portal, a visitor on the marketing site who
 * has not signed in, and an operator deciding whether it should stay up. They
 * are looking at the same offer, so they look at it in the same shape — and a
 * vendor's preview that flattered the real thing would be the worst of the
 * four to get wrong.
 *
 * The order is the order a buyer reads in: what it is, which tier, what that
 * tier contains and costs, what is not in it, and only then how to ask for it.
 */
export function PackageShowcase({
  pkg,
  renderAction,
  headerAction,
  defaultTierId,
  onTierChange,
  offers,
  renderOfferAction,
  variant = 'card',
}: PackageShowcaseProps) {
  const tiers = useMemo(() => packageTiers(pkg), [pkg]);
  const addOns = useMemo(() => packageAddOns(pkg), [pkg]);
  const fallbackTierId = defaultTierId ?? defaultPackageTier(pkg)?.id ?? null;

  const [selectedTierId, setSelectedTierId] = useState<string | null>(fallbackTierId);

  // Re-seeds when the package itself changes — a list that swaps one package
  // for another under the same mounted showcase would otherwise keep pointing
  // at a tier id that no longer exists and render an empty breakdown.
  useEffect(() => {
    setSelectedTierId((current) =>
      current && tiers.some((tier) => tier.id === current) ? current : fallbackTierId,
    );
  }, [tiers, fallbackTierId]);

  const tier = tiers.find((entry) => entry.id === selectedTierId) ?? tiers[0] ?? null;
  const listPricing = useMemo(() => packageTierPricing(pkg, tier), [pkg, tier]);

  // Re-derived per tier, not per package. A tier-scoped offer moves the Gold
  // price and leaves Silver alone, and an offer with a minimum spend applies to
  // the tiers that reach it and not the ones that do not — so the ribbon and
  // the total have to be recomputed every time the reader switches tabs.
  const offer = useMemo(
    () => bestOffer(applicableOffers(offers, listPricing), listPricing.net, listPricing.base),
    [offers, listPricing],
  );
  const pricing = useMemo(() => applyOfferToTier(listPricing, offer), [listPricing, offer]);

  const select = (tierId: string) => {
    setSelectedTierId(tierId);
    onTierChange?.(tierId);
  };

  const body = (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
            {pkg.name}
          </Typography>
          {pkg.summary && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {pkg.summary}
            </Typography>
          )}
          {/* Above the tiers, not beside the total. How a client is charged
              changes what the total below MEANS — an hourly package's figure
              covers the listed hours and no more — so it has to be read before
              the number, not as a footnote to it. Renders nothing on a package
              that predates the column. */}
          <Box sx={{ mt: 1 }}>
            <PricingModelChip model={pkg.pricing_model} />
          </Box>
        </Box>
        {headerAction}
      </Stack>

      {/* Above the tiers, not beside the total. A client reading a discounted
          figure has to know it is discounted BEFORE they read it, or the number
          lands as the vendor's ordinary price and the saving does no work. A
          badge tucked beside the total is read after the decision it was meant
          to influence. */}
      {pricing.offer && tier && (
        <OfferRibbon
          offer={pricing.offer}
          savingLabel={formatAmount(pricing.offerSaving, pricing.currency)}
          // Said on the card, not just in the terms. An offer titled "20% off"
          // that takes off far less than 20% reads as a pricing fault, and a
          // reader who cannot see the ceiling has no way to tell that it isn't
          // one. Absent — and silent — on every offer the ceiling did not touch.
          note={
            pricing.offerCap == null
              ? null
              : `Capped at ${formatAmount(pricing.offerCap, pricing.currency)}`
          }
          action={renderOfferAction?.(pricing.offer, tier)}
        />
      )}

      <PackageTierTabs
        pkg={pkg}
        tiers={tiers}
        selectedTierId={tier?.id ?? null}
        onSelect={select}
      />

      {tier?.description && (
        <Typography variant="body2" color="text.secondary">
          {tier.description}
        </Typography>
      )}

      {tier ? (
        <PackageTierBreakdown
          pricing={pricing}
          sharedAddOns={addOns}
          offerLine={
            pricing.offer
              ? {
                  label: pricing.offer.title || 'Promotion',
                  amount: pricing.offerSaving,
                  hint:
                    pricing.offerCap == null
                      ? undefined
                      : `This offer is capped at ${formatAmount(pricing.offerCap, pricing.currency)}, which is less than its rate would have taken off this tier.`,
                }
              : undefined
          }
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          This package has no tiers yet.
        </Typography>
      )}

      {/* Ternary, not `&&`: both lists are arrays, and `0 || 0` is `0` — which
          React renders as the character "0" on the page rather than as
          nothing. A boolean guard is the only shape that is safe here. */}
      {pkg.inclusions?.length || pkg.exclusions?.length ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2.5, sm: 4 }}
          sx={{ '& > *': { flex: 1, minWidth: 0 } }}
        >
          <PackageScopeList title="What's included" items={pkg.inclusions} tone="included" />
          <PackageScopeList title="Not included" items={pkg.exclusions} tone="excluded" />
        </Stack>
      ) : null}

      <PackageTerms pkg={pkg} total={pricing.total} />

      {pkg.notes && (
        <Typography variant="caption" color="text.secondary">
          {pkg.notes}
        </Typography>
      )}

      {tier && renderAction && <Box>{renderAction(tier, pricing, pricing.offer)}</Box>}
    </Stack>
  );

  if (variant === 'plain') return body;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {pkg.cover_image_url && (
        <Box
          component="img"
          src={pkg.cover_image_url}
          alt=""
          loading="lazy"
          sx={{
            display: 'block',
            width: '100%',
            // A fixed ratio rather than a fixed height: the same card sits in a
            // three-across grid on a desktop and full-bleed on a phone, and a
            // height that suits one crops the other.
            aspectRatio: '16 / 7',
            objectFit: 'cover',
            bgcolor: (t) => alpha(t.palette.text.primary, 0.06),
          }}
        />
      )}
      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>{body}</Box>
    </Paper>
  );
}

/**
 * The terms that travel with the package — how far ahead to book, how long a
 * quote from it stands, and what is due up front.
 *
 * Chips rather than a table because these are qualifiers on the price, not
 * components of it, and because three short facts in a wrapping row survive a
 * phone better than three label/value rows.
 */
function PackageTerms({ pkg, total }: { pkg: QuotePackageLike; total: number }) {
  const advance = advanceTermsSummary(pkg.advance_rate, pkg.advance_release_days_before);

  const facts: { icon: ReactNode; label: string }[] = [
    ...(pkg.lead_time_days != null && pkg.lead_time_days > 0
      ? [
          {
            icon: <EventAvailableRoundedIcon sx={{ fontSize: 16 }} />,
            label: `Book at least ${pkg.lead_time_days} day${pkg.lead_time_days === 1 ? '' : 's'} ahead`,
          },
        ]
      : []),
    ...(pkg.valid_days != null && pkg.valid_days > 0
      ? [
          {
            icon: <ScheduleRoundedIcon sx={{ fontSize: 16 }} />,
            label: `Quotes valid ${pkg.valid_days} days`,
          },
        ]
      : []),
    ...(advance && total > 0
      ? [{ icon: <PaymentsRoundedIcon sx={{ fontSize: 16 }} />, label: `Advance ${advance}` }]
      : []),
  ];

  if (facts.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {facts.map((fact) => (
        <Chip
          key={fact.label}
          size="small"
          icon={fact.icon as never}
          label={fact.label}
          variant="outlined"
          sx={{ '& .MuiChip-label': { fontSize: 12 } }}
        />
      ))}
    </Stack>
  );
}
