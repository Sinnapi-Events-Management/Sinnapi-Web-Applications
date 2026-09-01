import { useNavigate, useParams } from 'react-router-dom';
import { useBreadcrumbTitle, useUrlTab } from '@sinnapi/ui/router';
import { useVendor, useVendorKpis } from '@/hooks/queries';
import { useVendorStatus } from '@/hooks/useVendorStatus';
import type { NamedRef, OwnerRef } from '@/lib/types';
import { VENDOR_TABS } from '../schema';

/** Supabase embeds a to-one relation as an object or a single-item array. */
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Detail view for a single live vendor: profile, KPI counts and the open
 * section.
 *
 * The active/suspended flow (confirm, reason, write) is owned by
 * `useVendorStatus` and shared with the vendors list. Related collections
 * (bookings, payments, offers, …) are loaded lazily by each tab so switching
 * tabs stays cheap.
 *
 * The open section lives in the URL rather than in component state, so a
 * reload, the back button, or a link pasted into a moderation thread all land
 * on the section that was being read — "look at their offers" has to survive
 * being sent to a colleague.
 */
export function useVendorDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: vendor, isLoading, error } = useVendor(id);
  const { data: kpis } = useVendorKpis(id);
  const status = useVendorStatus();
  const { tab, setTab } = useUrlTab(VENDOR_TABS);

  useBreadcrumbTitle(vendor?.business_name);

  const owner = firstOf<OwnerRef>(vendor?.owner);
  const category = firstOf<NamedRef>(vendor?.category);

  return { id, vendor, owner, category, kpis, isLoading, error, status, navigate, tab, setTab };
}
