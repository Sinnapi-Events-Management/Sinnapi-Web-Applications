import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Menu,
  MenuItem,
  Stack,
  Typography,
  formatAmount,
  packageTierPricing,
  packageTiers,
  type PackageTierLike,
} from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import InventoryOutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { PackageModel } from '@/lib/types';

type Props = {
  packages: PackageModel[];
  isLoading: boolean;
  applied: PackageModel | null;
  appliedTierId: string | null;
  onApply: (pkg: PackageModel, tier: PackageTierLike) => void;
  onClear: () => void;
};

/**
 * Start a quote from a package the vendor already priced.
 *
 * One menu of package → tier rather than two selects, because the two choices
 * are one decision: nobody picks "Wedding Photography" without already knowing
 * which tier they mean. Every entry carries its price, so the vendor is
 * choosing between numbers rather than between names they then have to recall
 * the price of.
 *
 * Applying replaces the quote and says so, because it does: line items,
 * discount, tax and the advance schedule all come from the tier. A vendor who
 * has typed half a quote should be told that before they lose it, not after.
 *
 * Renders nothing while there are no packages. A vendor who has not made one
 * does not need a control explaining what they are missing in the middle of
 * answering a request — the Packages page is where that conversation belongs.
 */
export default function QuotationPackagePicker({
  packages,
  isLoading,
  applied,
  appliedTierId,
  onApply,
  onClear,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  if (isLoading || packages.length === 0) return null;

  const appliedTier = applied
    ? packageTiers(applied).find((tier) => tier.id === appliedTierId)
    : null;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.12 : 0.05),
        border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <InventoryOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography variant="subtitle2" fontWeight={700}>
              {applied ? 'Built from a package' : 'Start from a package'}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {applied && appliedTier
              ? `${applied.name} — ${appliedTier.name}. Everything below is still yours to change.`
              : 'Fills in the line items, discount, tax and advance terms you already priced.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {applied && (
            <Button size="small" color="inherit" onClick={onClear}>
              Unlink
            </Button>
          )}
          <Button
            size="small"
            variant={applied ? 'outlined' : 'contained'}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            {applied ? 'Change' : 'Choose package'}
          </Button>
        </Stack>
      </Stack>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 420, minWidth: 280 } } }}
      >
        {packages.flatMap((pkg) => [
          <MenuItem key={`${pkg.id}-label`} disabled sx={{ opacity: '1 !important' }}>
            <Typography variant="overline" color="text.secondary">
              {pkg.name}
            </Typography>
          </MenuItem>,
          ...packageTiers(pkg).map((tier) => {
            const pricing = packageTierPricing(pkg, tier);
            return (
              <MenuItem
                key={tier.id}
                selected={tier.id === appliedTierId}
                onClick={() => {
                  setAnchor(null);
                  onApply(pkg, tier);
                }}
                sx={{ pl: 3 }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ width: '100%', minWidth: 0 }}
                >
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
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
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                    {formatAmount(pricing.total, pricing.currency)}
                  </Typography>
                </Stack>
              </MenuItem>
            );
          }),
        ])}
      </Menu>
    </Box>
  );
}
