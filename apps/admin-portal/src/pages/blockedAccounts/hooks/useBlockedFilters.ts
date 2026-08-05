import { useMemo, useState } from 'react';
import { useSearchTerm, type SearchTerm } from '@/hooks/useSearchTerm';

/** Account kinds the list can be narrowed to. Empty string = both. */
export const KIND_OPTIONS = [
  { value: '', label: 'All blocks' },
  { value: 'locked_out', label: 'Locked out' },
  { value: 'suspended', label: 'Suspended' },
] as const;

/**
 * Role filter values, matched server-side against the account's role keys.
 * `admin` is special: it means "holds any is_admin role" rather than a single
 * key, because the four staff roles are separate rows.
 */
export const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'client', label: 'Client' },
  { value: 'event_planner', label: 'Event Planner' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'admin', label: 'Staff' },
] as const;

export type BlockedFiltersApi = {
  kind: string;
  role: string;
  setKind: (value: string) => void;
  setRole: (value: string) => void;
  search: SearchTerm;
  reset: () => void;
  /** How many filters are applied — drives the "Clear" affordance. */
  activeCount: number;
};

/**
 * Owns the Blocked Accounts filter state.
 *
 * Free-text search comes from the shared `useSearchTerm`, so it is debounced
 * and mirrored to `?q=` like every other admin list; the two selects are local
 * because they are cheap and change rarely. Every change resets pagination via
 * `onChange` — a filtered set is usually shorter than the page you were on.
 */
export function useBlockedFilters(onChange: () => void): BlockedFiltersApi {
  const [kind, setKindValue] = useState('');
  const [role, setRoleValue] = useState('');
  const search = useSearchTerm({ onChange });

  const setKind = (value: string) => {
    setKindValue(value);
    onChange();
  };

  const setRole = (value: string) => {
    setRoleValue(value);
    onChange();
  };

  const reset = () => {
    setKindValue('');
    setRoleValue('');
    search.clear();
    onChange();
  };

  const activeCount = useMemo(
    () => [kind, role, search.query ?? ''].filter(Boolean).length,
    [kind, role, search.query],
  );

  return { kind, role, setKind, setRole, search, reset, activeCount };
}
