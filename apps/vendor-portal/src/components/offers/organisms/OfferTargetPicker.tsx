import { useMemo } from 'react';
import { Alert, Box, Button, Divider, Paper, Stack, Typography } from '@sinnapi/ui';
import { alpha } from '@mui/material/styles';
import { formatAmount } from '@sinnapi/ui';
import { isPackagePublished, packageTierPricing } from '@sinnapi/ui/molecules';
import type { PackageModel, ServiceModel } from '@/lib/types';
import OfferTargetRow from '../molecules/OfferTargetRow';
import {
  packageKey,
  serviceKey,
  targetSummary,
  tierKey,
  type TargetKey,
} from '../schema/offerTargets';

type Props = {
  packages: readonly PackageModel[];
  services: readonly ServiceModel[];
  selected: ReadonlySet<TargetKey>;
  onToggle: (key: TargetKey) => void;
  onClear: () => void;
  isLoading?: boolean;
};

/**
 * What this offer is for.
 *
 * THE FIELD THIS FEATURE EXISTS FOR
 * Before it, a vendor could publish "20% off" and the platform could not say
 * twenty percent off what — so nothing could show the offer to a client next to
 * a price, and nothing could apply it to a quote. Everything else in this
 * dialog describes the discount; this is the part that connects it to something
 * a client can buy.
 *
 * THREE LEVELS, BECAUSE VENDORS SELL AT THREE LEVELS
 * A service covers every package under it, so a photographer running a sale on
 * videography ticks one box rather than six. A package covers its tiers. A tier
 * is the sharp instrument: "20% off Gold" is how a vendor moves the tier they
 * want to move without discounting the one they already sell out of.
 *
 * TICKING A PACKAGE UNTICKS ITS TIERS
 * Handled in `toggleTarget`, not here, but it is visible here and worth saying
 * why: a package row already covers every tier, and holding both would make
 * `package_offers` derive a `scope` of `tier` — so a client's card would read
 * "This tier only" for an offer the vendor meant to apply to the whole package.
 *
 * UNPUBLISHED PACKAGES ARE SHOWN AND DISABLED
 * An offer on a private package reaches nobody. Filtering them out would leave
 * a vendor hunting for a package that is right there in their catalogue;
 * greying them with the reason turns a dead end into the next thing to do.
 *
 * NO SELECTION IS LEGAL AND SAYS SO
 * An offer with no targets applies to everything the vendor sells. That is the
 * shape every existing row has — nothing could attach a target before this
 * shipped — so the picker states it plainly rather than refusing to save. It is
 * a real choice, not an empty field.
 */
export default function OfferTargetPicker({
  packages,
  services,
  selected,
  onToggle,
  onClear,
  isLoading,
}: Props) {
  const summary = useMemo(
    () => targetSummary(selected, packages, services),
    [selected, packages, services],
  );

  // Services with at least one package under them. A service with none cannot
  // be discounted into anything a client can buy, and offering it would let a
  // vendor build an offer that resolves to nothing.
  const usableServices = useMemo(
    () =>
      services.filter(
        (service) =>
          service.deleted_at == null &&
          packages.some((pkg) => pkg.vendor_service_id === service.id),
      ),
    [services, packages],
  );

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700}>
          What this offer covers
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Pick the packages or tiers clients get this saving on. Leave everything unticked and it
          applies to your whole catalogue.
        </Typography>
      </Box>

      <Alert
        severity={selected.size === 0 ? 'warning' : 'success'}
        sx={{ py: 0.5 }}
        action={
          selected.size > 0 ? (
            <Button size="small" color="inherit" onClick={onClear}>
              Clear
            </Button>
          ) : undefined
        }
      >
        {summary}
      </Alert>

      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          // Scrolls rather than growing: a vendor with fifteen packages would
          // otherwise push the dialog's save button off a laptop screen.
          maxHeight: { xs: 260, sm: 320 },
          overflowY: 'auto',
          p: 1,
        }}
      >
        {isLoading ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
            Loading your catalogue…
          </Typography>
        ) : packages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
            You have no packages yet. Publish one and you can point an offer at it — until then this
            offer applies to everything you sell.
          </Typography>
        ) : (
          <Stack spacing={0.25}>
            {usableServices.length > 0 && (
              <>
                <SectionLabel>Whole services</SectionLabel>
                {usableServices.map((service) => (
                  <OfferTargetRow
                    key={service.id}
                    checked={selected.has(serviceKey(service.id))}
                    onToggle={() => onToggle(serviceKey(service.id))}
                    label={service.title}
                    meta={`Every package under this service`}
                  />
                ))}
                <Divider sx={{ my: 0.75 }} />
              </>
            )}

            <SectionLabel>Packages and tiers</SectionLabel>
            {packages.map((pkg) => {
              const published = isPackagePublished(pkg);
              const tiers = pkg.quote_template_tiers ?? [];

              return (
                <Box key={pkg.id}>
                  <OfferTargetRow
                    checked={selected.has(packageKey(pkg.id))}
                    onToggle={() => onToggle(packageKey(pkg.id))}
                    label={pkg.name}
                    meta={`${tiers.length} ${tiers.length === 1 ? 'tier' : 'tiers'}`}
                    disabled={!published}
                    disabledReason={
                      published ? undefined : 'Not published — clients cannot see this package'
                    }
                  />

                  {published &&
                    tiers.map((tier) => {
                      const pricing = packageTierPricing(pkg, tier);
                      return (
                        <OfferTargetRow
                          key={tier.id}
                          indent
                          checked={selected.has(tierKey(pkg.id, tier.id))}
                          onToggle={() => onToggle(tierKey(pkg.id, tier.id))}
                          label={tier.name}
                          meta={
                            pricing.isPriced
                              ? formatAmount(pricing.total, pricing.currency)
                              : 'No priced lines yet'
                          }
                          // A package ticked as a whole already covers every
                          // tier. Leaving the tiers live would invite a vendor
                          // to tick one and silently narrow the offer they just
                          // made — `toggleTarget` would drop the package row.
                          disabled={selected.has(packageKey(pkg.id))}
                          disabledReason={
                            selected.has(packageKey(pkg.id))
                              ? 'Covered by the whole package'
                              : undefined
                          }
                        />
                      );
                    })}
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{
        px: 1,
        pt: 0.5,
        color: 'text.secondary',
        letterSpacing: '0.1em',
        // Sticks while the list scrolls, so a vendor eight packages down still
        // knows which of the two groups they are in.
        position: 'sticky',
        top: -8,
        bgcolor: (t) => alpha(t.palette.background.paper, 0.96),
        zIndex: 1,
        display: 'block',
      }}
    >
      {children}
    </Typography>
  );
}
