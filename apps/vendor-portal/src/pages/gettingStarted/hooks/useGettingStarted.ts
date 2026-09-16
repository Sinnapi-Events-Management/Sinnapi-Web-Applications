import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVendorContext } from '@/vendor/VendorProvider';
import { STEPS, type StepKey } from '../schema/steps';
import { useOnboardingStatus } from './useOnboardingStatus';
import { useVendorPatch } from './useVendorPatch';

/**
 * The wizard's position and navigation.
 *
 * The opening step is the first one still missing something, so a vendor who
 * completed two steps yesterday resumes where they stopped instead of clicking
 * through what they already did. After that the index is theirs to move — the
 * status only decides where they LAND, never where they may go, or a vendor
 * correcting an earlier answer would be bounced forward as they saved it.
 *
 * `?step=<key>` overrides the landing step, so another page can send a vendor
 * straight to the step that edits what they were looking at (the Profile page
 * links to `verification` for proof of work). `?returnTo=/path` is where
 * finishing goes instead of the dashboard — same-origin paths only, so the
 * parameter can't be used to bounce someone off-site.
 */
function safeReturnTo(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

export function useGettingStarted() {
  const { vendor } = useVendorContext();
  const vendorId = vendor?.id ?? '';
  const status = useOnboardingStatus(vendor?.id);
  const patch = useVendorPatch(vendorId);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedStep = STEPS.findIndex((s) => s.key === (params.get('step') as StepKey));
  const returnTo = safeReturnTo(params.get('returnTo'));

  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (index !== null) return;
    if (requestedStep >= 0) {
      setIndex(requestedStep);
      return;
    }
    if (status.isLoading) return;
    const first = status.firstIncomplete;
    setIndex(first ? STEPS.findIndex((s) => s.key === first) : 0);
  }, [index, requestedStep, status.firstIncomplete, status.isLoading]);

  const active = index ?? 0;
  const isLast = active === STEPS.length - 1;

  const back = useCallback(() => setIndex((i) => Math.max((i ?? 0) - 1, 0)), []);

  /**
   * Finishing stamps `onboarding_completed_at`, which is what releases the rest
   * of the portal. Stamped only when nothing required is outstanding, so a
   * vendor who jumped back and cleared a field cannot leave with a half-filled
   * listing.
   */
  const finish = useCallback(async () => {
    if (status.isComplete && !status.vendor?.onboarding_completed_at) {
      await patch.mutateAsync({ onboarding_completed_at: new Date().toISOString() });
    }
    navigate(returnTo ?? '/dashboard');
  }, [navigate, patch, returnTo, status.isComplete, status.vendor?.onboarding_completed_at]);

  /** Advance, or leave the wizard when this was the last step. */
  const next = useCallback(() => {
    if (isLast) return finish();
    setIndex((i) => Math.min((i ?? 0) + 1, STEPS.length - 1));
    return Promise.resolve();
  }, [finish, isLast]);

  /**
   * A vendor who has finished once is here by choice (the Profile page links in
   * to edit one step), so nothing holds them. First-timers get no way back to a
   * portal the gate would only redirect them out of.
   */
  const canLeave = !!status.vendor?.onboarding_completed_at;
  const leaveLabel = returnTo?.startsWith('/profile') ? 'Back to profile' : 'Back to dashboard';
  const leave = useCallback(() => navigate(returnTo ?? '/dashboard'), [navigate, returnTo]);

  return {
    vendorId,
    canLeave,
    leaveLabel,
    leave,
    step: STEPS[active],
    index: active,
    stepCount: STEPS.length,
    isLast,
    status,
    back,
    next,
    finish,
    goTo: setIndex,
    finishing: patch.isPending,
  };
}
