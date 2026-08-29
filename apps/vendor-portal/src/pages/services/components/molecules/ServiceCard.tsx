import { Box, Card, CardContent, Divider, LinearProgress, Stack, Typography } from '@sinnapi/ui';
import ServiceStatusChip from '../atoms/ServiceStatusChip';
import ServiceCardMenu from './ServiceCardMenu';
import ServicePricingModels from './ServicePricingModels';
import ServicePriceSummary from './ServicePriceSummary';
import type { ServiceRow } from '../../hooks/useServices';

type Props = {
  service: ServiceRow;
  pricingLoading: boolean;
  /** This card has a write in flight. */
  busy: boolean;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onArchive: () => void;
  onRestore: () => void;
};

/**
 * One line of the vendor's catalogue.
 *
 * Reads top to bottom the way the vendor thinks about it: what the service is,
 * whether clients can see it, how they will be paid for it, and — last,
 * beneath a rule — what the market currently pays. The price is at the bottom
 * and derived rather than at the top and editable, because it is a consequence
 * of the packages rather than a property of the service.
 *
 * `height: '100%'` with a flex column and a spacer above the divider is what
 * keeps the price rules aligned across a row of cards whose descriptions are
 * different lengths. Without it the grid reads as ragged on a wide screen,
 * which makes two prices look harder to compare than they are.
 *
 * The in-flight state is a hairline progress bar pinned to the top of the card
 * rather than a spinner in place of the content. Hiding a service takes one
 * round trip, and swapping a card the vendor is reading for a spinner in that
 * time is a bigger interruption than the write it is reporting.
 */
export default function ServiceCard({
  service,
  pricingLoading,
  busy,
  onEdit,
  onToggleVisibility,
  onArchive,
  onRestore,
}: Props) {
  const isArchived = service.state === 'archived';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        // Out of play, still legible — the same treatment archived packages
        // get, so the two screens agree on what "not live" looks like. Both
        // values are opacities rather than greys, so this reads identically on
        // the warm dark canvas and on the light one.
        opacity: isArchived ? 0.6 : service.state === 'hidden' ? 0.78 : 1,
        transition: (t) => t.transitions.create('opacity', { duration: 150 }),
      }}
    >
      {busy && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', height: 2 }} />}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
            {service.title}
          </Typography>
          <ServiceStatusChip state={service.state} />
          <ServiceCardMenu
            title={service.title}
            state={service.state}
            disabled={busy}
            onEdit={onEdit}
            onToggleVisibility={onToggleVisibility}
            onArchive={onArchive}
            onRestore={onRestore}
          />
        </Stack>

        {service.description && (
          <Typography variant="body2" color="text.secondary">
            {service.description}
          </Typography>
        )}

        <ServicePricingModels models={service.pricing_models} />

        <Box sx={{ flex: 1 }} />
        <Divider />

        {isArchived ? (
          // The "from" figure is an answer to "what can a client pay for this",
          // and for an archived service the answer is nothing. Showing a price
          // here would be the card quoting an offer that is not on sale.
          <Typography variant="body2" color="text.secondary">
            Out of your catalogue. Restore it to list it again — its packages and past bookings are
            untouched.
          </Typography>
        ) : (
          <ServicePriceSummary pricing={service.pricing} loading={pricingLoading} />
        )}
      </CardContent>
    </Card>
  );
}
