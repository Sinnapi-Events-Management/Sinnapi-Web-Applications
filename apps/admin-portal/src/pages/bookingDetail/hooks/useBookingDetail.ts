import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useBookingAdmin, useBookingActivity } from '@/hooks/queries';
import { useBookingStatus } from './useBookingStatus';
import { availableStatusTargets } from '../schema/statusActions';
import { formatTimeWindow } from '../utils/timeWindow';

/**
 * Everything the console's booking page renders, resolved in one place: the
 * booking with both parties and its money, the merged activity trail, and the
 * overrides available from its current state. Components below this receive
 * finished data and decide only how it looks.
 */
export function useBookingDetail() {
  const { id = '' } = useParams();

  const { data: booking, isLoading, error } = useBookingAdmin(id);
  const activity = useBookingActivity(id);
  const status = useBookingStatus(id);

  // The reference number is what every other party quotes in correspondence,
  // so it is the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(booking?.reference_no ? `Booking ${booking.reference_no}` : undefined);

  const targets = useMemo(() => availableStatusTargets(booking?.status ?? ''), [booking?.status]);

  return {
    id,
    booking,
    isLoading,
    error,

    activity: activity.data ?? [],
    isActivityLoading: activity.isLoading,
    activityError: activity.error,

    /** The overrides offered from this booking's state; empty once settled. */
    targets,
    status,

    /** `null` when the request carried no times — the row is then omitted. */
    timeWindow: formatTimeWindow(booking?.start_time, booking?.end_time),
  };
}
