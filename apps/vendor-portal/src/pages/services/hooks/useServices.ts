import { useCallback, useMemo, useState } from 'react';
import { useServices as useServicesQuery } from '@/hooks/queries';
import { useServicePricing, type ServicePricing } from './useServicePricing';
import {
  matchesServiceFilter,
  serviceState,
  type ServiceFilter,
  type ServiceState,
} from '../schema';
import type { ServiceModel } from '@/lib/types';

/** A service, with the market's answer to what it costs and where it stands. */
export type ServiceRow = ServiceModel & { pricing: ServicePricing; state: ServiceState };

/**
 * The services screen: the catalogue, what each line is worth, and which slice
 * of it is on screen.
 *
 * The two reads are joined here rather than in the card so that a card is
 * given a row and renders it. A card that fetched its own packages would issue
 * one query per service and would make the "from" figure a per-card
 * responsibility — which is how two cards end up formatting the same money
 * differently.
 *
 * WHAT THIS HOOK DOES NOT OWN
 * Nothing that WRITES. Editing lives in `useServiceForm`, mounted with the
 * dialog so a cancelled draft is discarded with it; hiding, archiving and
 * restoring live in `useServiceActions`. The split is the same one the
 * packages screen makes and for the same reason: an action's in-flight state
 * belongs to one card, while the filter belongs to the whole page, and one
 * hook holding both re-renders every card whenever any one of them is hidden.
 *
 * `editing` holds the service rather than its id, so the dialog seeds its form
 * synchronously from data the list already has. Re-fetching it on open would
 * put a spinner in front of a form the browser could already draw.
 */
export function useServices(vendorId: string) {
  // Archived rows included: this is the one screen that can show them, and the
  // Archived tab has to be able to count what is in it before the vendor opens
  // it. Everywhere else a service is picked rather than managed reads the
  // default, live-only query.
  const services = useServicesQuery(vendorId, { includeArchived: true });
  const { pricingFor, isLoading: pricingLoading } = useServicePricing(vendorId);

  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [editing, setEditing] = useState<ServiceModel | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);

  const rows = useMemo<ServiceRow[]>(
    () =>
      (services.data ?? []).map((service) => ({
        ...service,
        pricing: pricingFor(service.id),
        state: serviceState(service),
      })),
    [services.data, pricingFor],
  );

  const visible = useMemo(
    () => rows.filter((service) => matchesServiceFilter(service, filter)),
    [rows, filter],
  );

  const counts = useMemo<Record<ServiceFilter, number>>(
    () => ({
      all: rows.filter((service) => service.state !== 'archived').length,
      live: rows.filter((service) => service.state === 'live').length,
      hidden: rows.filter((service) => service.state === 'hidden').length,
      archived: rows.filter((service) => service.state === 'archived').length,
    }),
    [rows],
  );

  const create = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);

  const edit = useCallback((service: ServiceModel) => {
    setEditing(service);
    setEditorOpen(true);
  }, []);

  // Cleared on close as well as on open, so re-opening before the next render
  // cannot flash the previous service's fields.
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditing(null);
  }, []);

  return {
    rows,
    visible,
    counts,
    filter,
    setFilter,
    // The list is what the screen is for; a failed package read costs the
    // cards their "from" figure and nothing else, so it must not blank the
    // page. `pricingLoading` is deliberately not folded into this either —
    // the catalogue renders as soon as it arrives and the prices fill in.
    isLoading: services.isLoading,
    error: services.error,
    pricingLoading,
    /** No services at all, as opposed to none under the current filter. */
    isEmpty: rows.length === 0,
    editing,
    isEditorOpen,
    create,
    edit,
    closeEditor,
  };
}
