'use client';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { formatAmount } from './money';
import { packageTierPricing, type PackageTierLike, type QuotePackageLike } from './packagePricing';

export type PackageTierTabsProps = {
  pkg: QuotePackageLike;
  tiers: readonly PackageTierLike[];
  selectedTierId: string | null;
  onSelect: (tierId: string) => void;
};

/**
 * The tier switcher: one pressable card per tier, each carrying its own price.
 *
 * Not MUI <Tabs />, and not a <Select />. A tier is a purchase decision, and
 * the price is half of what the decision is made on — a tab strip showing only
 * names would make a client click through three tiers to learn three numbers
 * they should be able to compare at a glance.
 *
 * Horizontally scrollable rather than wrapping on narrow screens, so three
 * tiers stay a row the thumb can swipe instead of a stack that pushes the
 * breakdown below the fold. The scrollbar is hidden because the partially
 * visible third card is the affordance.
 *
 * Selection is the caller's state, not this component's — the page that owns
 * the tier is usually also the page that submits it.
 */
export function PackageTierTabs({ pkg, tiers, selectedTierId, onSelect }: PackageTierTabsProps) {
  if (tiers.length <= 1) return null;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      role="tablist"
      aria-label="Package tiers"
      sx={{
        overflowX: 'auto',
        pb: 1,
        // The row is a scroll container on a phone and a plain row from `sm`,
        // where three cards fit without one.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {tiers.map((tier) => {
        const pricing = packageTierPricing(pkg, tier);
        const selected = tier.id === selectedTierId;

        return (
          <Box
            key={tier.id}
            role="tab"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onSelect(tier.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(tier.id);
              }
            }}
            sx={{
              flex: { xs: '0 0 auto', sm: 1 },
              minWidth: { xs: 148, sm: 0 },
              cursor: 'pointer',
              borderRadius: 2,
              p: 1.75,
              textAlign: 'left',
              transition: (t) => t.transitions.create(['border-color', 'background-color']),
              border: (t) => `1.5px solid ${selected ? t.palette.primary.main : t.palette.divider}`,
              bgcolor: (t) =>
                selected
                  ? alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.18 : 0.07)
                  : 'transparent',
              '&:hover': {
                borderColor: (t) => (selected ? t.palette.primary.main : t.palette.text.disabled),
              },
              '&:focus-visible': {
                outline: (t) => `2px solid ${t.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                {tier.name}
              </Typography>
              {tier.is_recommended && (
                <Chip
                  label="Popular"
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
            </Stack>
            <Typography variant="body2" fontWeight={700} noWrap>
              {pricing.isPriced ? formatAmount(pricing.total, pricing.currency) : 'Not priced'}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}
