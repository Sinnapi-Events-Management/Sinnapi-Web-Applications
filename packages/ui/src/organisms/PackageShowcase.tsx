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
  type PackageTierPricing,
  type QuotePackageLike,
} from '../molecules/packagePricing';
import { PackageTierBreakdown } from './PackageTierBreakdown';

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
  renderAction?: (tier: PackageTierLike, pricing: PackageTierPricing) => ReactNode;
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
  const pricing = useMemo(() => packageTierPricing(pkg, tier), [pkg, tier]);

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
        <PackageTierBreakdown pricing={pricing} sharedAddOns={addOns} />
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

      {tier && renderAction && <Box>{renderAction(tier, pricing)}</Box>}
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
