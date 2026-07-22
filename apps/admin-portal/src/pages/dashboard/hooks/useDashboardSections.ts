import { useMemo } from 'react';
import { useAdmin } from '@/admin/AdminProvider';
import { SECTIONS, type SectionKey } from '../schema';

/**
 * Which dashboard sections this admin may see. A section shows when the admin
 * holds any one of its permissions — a finance-only admin gets the money band,
 * a support admin gets trust & safety — so the page reflows to the role instead
 * of rendering cards that would come back empty.
 *
 * Purely an affordance: the RPC gates the same data server-side, so this decides
 * layout, never access.
 */
export function useDashboardSections() {
  const { has } = useAdmin();

  return useMemo(() => {
    const visible = new Set<SectionKey>(
      SECTIONS.filter((s) => s.anyOf.some((perm) => has(perm))).map((s) => s.key),
    );
    return {
      canSee: (key: SectionKey) => visible.has(key),
      /** True when the admin holds none of the dashboard's permissions at all. */
      isEmpty: visible.size === 0,
    };
    // `has` closes over the permission Set, which is rebuilt whenever it changes.
  }, [has]);
}
