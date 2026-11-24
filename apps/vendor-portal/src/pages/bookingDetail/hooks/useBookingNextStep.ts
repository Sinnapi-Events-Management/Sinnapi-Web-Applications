import { useMemo } from 'react';
import {
  canRequestSettlement,
  canRespondToSettlement,
  evaluateBookingStartGate,
  localToday,
} from '@sinnapi/ui';
import { useVendorBookingEscrow, useVendorBookingSettlement } from '@/hooks/queries';
import { formatMoney } from '@/lib/config';
import { daysFromToday, relativeDay } from '@/lib/bookingCopy';
import type { VendorBookingDetailModel } from '@/lib/types';
import { bookingNextStep } from '../utils/nextStep';
import type { useBookingActions } from './useBookingActions';

const OPEN_REQUEST = [
  'vendor_requested',
  'admin_forwarded',
  'awaiting_vendor_consent',
  'consented',
];

/**
 * Feeds `bookingNextStep` from the reads this page already makes. Uses the
 * settlement *query* rather than `useSettlement`, which also opens a realtime
 * channel — the settlement card owns that subscription, and two channels with
 * one name would collide.
 */
export function useBookingNextStep(
  booking: VendorBookingDetailModel,
  actions: ReturnType<typeof useBookingActions>,
) {
  const { data: escrow } = useVendorBookingEscrow(booking.id);
  const { data: request } = useVendorBookingSettlement(booking.id);

  return useMemo(() => {
    const rail =
      booking.payment_type === 'escrow' || booking.payment_type === 'direct'
        ? booking.payment_type
        : null;
    const escrowStatus = escrow?.status ?? null;
    const open = !!request && OPEN_REQUEST.includes(request.status);
    const gate = canRequestSettlement({
      bookingStatus: booking.status,
      escrowStatus,
      isFrozen: !!escrow?.timers_frozen_at,
      hasOpenRequest: open,
    });
    const claimable =
      escrow != null
        ? Number(escrow.balance_amount ?? 0) +
          (escrow.advance_released_at ? 0 : Number(escrow.advance_amount ?? 0))
        : null;
    const startGate = evaluateBookingStartGate({
      status: booking.status,
      eventDate: booking.event_date,
      escrowStatus,
      today: localToday(),
    });
    const complete = actions.actions.find((a) => a.action === 'complete');

    return bookingNextStep({
      status: booking.status,
      rail,
      awaitingClientOnTerms: actions.terms.awaitingClient,
      isFunded: !!escrow && !['initiated', 'failed'].includes(escrow.status),
      isPaidOut: escrowStatus === 'paid_out',
      eventDays: daysFromToday(booking.event_date),
      eventWhen: relativeDay(booking.event_date)?.toLowerCase() ?? null,
      canComplete: !!complete && !complete.disabled,
      canStart: startGate.canStart,
      available: actions.actions.filter((a) => !a.disabled).map((a) => a.action),
      settlement: {
        mustRespond: !!request && canRespondToSettlement(request),
        canRequest: gate.allowed,
        inProgress: open,
        blockedReason: gate.blockedReason,
        claimable: claimable ? formatMoney(claimable, escrow?.currency ?? booking.currency) : null,
      },
      cancellationReason: booking.cancellation_reason,
    });
  }, [booking, escrow, request, actions.actions, actions.terms.awaitingClient]);
}
