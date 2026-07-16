import { useNavigate, useParams } from 'react-router-dom';
import { useVendor, useVendorKpis } from '@/hooks/queries';
import { useVendorStatus } from '@/hooks/useVendorStatus';
import type { NamedRef, OwnerRef } from '@/lib/types';

/** Supabase embeds a to-one relation as an object or a single-item array. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Detail view for a single live vendor: profile and KPI counts. The
// active/suspended flow (confirm, reason, write) is owned by `useVendorStatus`
// and shared with the vendors list. Related collections (bookings, payments, …)
// are loaded lazily by each tab so switching tabs stays cheap.
export function useVendorDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: vendor, isLoading, error } = useVendor(id);
  const { data: kpis } = useVendorKpis(id);
  const status = useVendorStatus();

  const owner = firstOf<OwnerRef>(vendor?.owner);
  const category = firstOf<NamedRef>(vendor?.category);

  return { id, vendor, owner, category, kpis, isLoading, error, status, navigate };
}
