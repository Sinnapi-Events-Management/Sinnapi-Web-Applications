import { useUrlTab } from '@sinnapi/ui/router';
import { BOOKING_TABS } from '../schema';
import { useBookingDetail } from './useBookingDetail';
import { useBookingLive } from './useBookingLive';

/**
 * The page's own state, which is only ever "which section is open" — kept in
 * the URL so a reload, a back button or a link pasted into a support thread all
 * land on the section that was being read.
 *
 * Everything else stays where it was: `useBookingDetail` owns the reads, and
 * each card below owns its own. Sections deliberately do not report whether
 * they have anything to show, so no tab can disappear underneath a client
 * mid-read — a section with nothing in it says so instead.
 */
export function useBookingDetailPage() {
  const detail = useBookingDetail();
  const { tab, setTab } = useUrlTab(BOOKING_TABS);

  // One subscription for the whole page, whatever tab is open: money moves
  // server-side and every section reads some of it.
  useBookingLive(detail.bookingId);

  return { ...detail, tab, setTab };
}
