import { Grid } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import ServiceCard from '../molecules/ServiceCard';
import type { ServiceRow } from '../../hooks/useServices';
import type { ServiceFilter } from '../../schema';

type Props = {
  rows: ServiceRow[];
  filter: ServiceFilter;
  /** How many services sit under each tab, for the empty states to reason with. */
  counts: Record<ServiceFilter, number>;
  /** The vendor has no services at all, as opposed to none under this filter. */
  isEmpty: boolean;
  pricingLoading: boolean;
  busyId: string | null;
  onAdd: () => void;
  onEdit: (service: ServiceRow) => void;
  onToggleVisibility: (service: ServiceRow) => void;
  onArchive: (service: ServiceRow) => void;
  onRestore: (service: ServiceRow) => void;
};

/**
 * The catalogue as a grid, or the reason it is empty.
 *
 * One column on a phone, two from `sm`, three from `md` — the same breakpoints
 * the packages grid uses, so a vendor moving between the two screens is
 * looking at one layout rather than two similar ones. Three is the ceiling:
 * a fourth column makes the derived price small enough to have to lean in for.
 *
 * FOUR EMPTY STATES, BECAUSE THEY ARE FOUR DIFFERENT SITUATIONS
 * A vendor with nothing at all needs to know what a service is for and be
 * handed the way to make one — this is the first screen a newly approved
 * vendor lands on. A vendor whose filter hides everything needs to know that
 * is what happened, not to be told their catalogue is empty. An empty Archived
 * tab is good news, so it says so rather than offering to fix it.
 *
 * The fourth is the one that is easy to get wrong: a vendor who has archived
 * every service they own is standing on All, looking at nothing, and telling
 * them to "switch back to All" would be advice to stay exactly where they are.
 * `counts.archived` is what separates that from an ordinary filtered miss, so
 * they are pointed at the tab their catalogue actually went to.
 */
export default function ServiceGrid({
  rows,
  filter,
  isEmpty,
  pricingLoading,
  busyId,
  counts,
  onAdd,
  onEdit,
  onToggleVisibility,
  onArchive,
  onRestore,
}: Props) {
  if (rows.length === 0) {
    if (isEmpty) {
      return (
        <EmptyState
          title="No services yet"
          description="List what you offer so clients can find you — then build packages under each service to put a price on it."
          ctaLabel="Add your first service"
          onCta={onAdd}
        />
      );
    }

    if (filter === 'archived') {
      return (
        <EmptyState
          title="Nothing archived"
          description="Services you take out of your catalogue land here, and you can put them back at any time."
        />
      );
    }

    if (filter === 'all' && counts.archived > 0) {
      const n = counts.archived;
      return (
        <EmptyState
          title="Your catalogue is empty"
          description={`${n === 1 ? 'Your only service is archived' : `All ${n} of your services are archived`}. Open the Archived tab to put one back, or add a new service.`}
          ctaLabel="Add a service"
          onCta={onAdd}
        />
      );
    }

    return (
      <EmptyState
        title="Nothing under this filter"
        description="Your other services are still here — switch back to All to see them."
      />
    );
  }

  return (
    <Grid container spacing={{ xs: 2, sm: 3 }}>
      {rows.map((service) => (
        <Grid item xs={12} sm={6} md={4} key={service.id}>
          <ServiceCard
            service={service}
            pricingLoading={pricingLoading}
            busy={busyId === service.id}
            onEdit={() => onEdit(service)}
            onToggleVisibility={() => onToggleVisibility(service)}
            onArchive={() => onArchive(service)}
            onRestore={() => onRestore(service)}
          />
        </Grid>
      ))}
    </Grid>
  );
}
