import { useCallback, useRef, useState } from 'react';
import { useVendorContext } from '@/vendor/VendorProvider';
import type { LogoGateReason } from '../schema/copy';

/** Something a vendor asked to do that sends a document to a client. */
export type GatedAction = () => void | Promise<unknown>;

/**
 * The state behind the logo-required dialog, owned once by `LogoGateProvider`.
 *
 * `requireLogo` runs the action straight away when a logo exists. When not,
 * it remembers the action, opens the dialog, and runs it the moment a logo
 * lands — so the vendor never retypes a quote or loses an invoice they were
 * halfway through. Cancelling forgets the action; nothing is sent.
 *
 * The returned promise settles when the action has finished (or the dialog
 * was cancelled), so a form's "submitting" state spans the whole thing.
 */
export function useLogoGateState() {
  const { vendor } = useVendorContext();
  const hasLogo = !!vendor?.primary_image_url?.trim();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<LogoGateReason>('general');
  const pending = useRef<{ action: GatedAction | null; settle: () => void } | null>(null);

  const requireLogo = useCallback(
    async (nextReason: LogoGateReason, action?: GatedAction): Promise<void> => {
      if (hasLogo) {
        await action?.();
        return;
      }
      // A second request while one waits replaces it; the first just settles.
      pending.current?.settle();
      await new Promise<void>((settle) => {
        pending.current = { action: action ?? null, settle };
        setReason(nextReason);
        setOpen(true);
      });
    },
    [hasLogo],
  );

  /** Opens the dialog with nothing waiting — the banner's "Add logo". */
  const openDialog = useCallback(() => void requireLogo('general'), [requireLogo]);

  const cancel = useCallback(() => {
    const waiting = pending.current;
    pending.current = null;
    setOpen(false);
    waiting?.settle();
  }, []);

  /** Called once the logo is saved: close, then carry on with what was asked. */
  const complete = useCallback(async () => {
    const waiting = pending.current;
    pending.current = null;
    setOpen(false);
    try {
      await waiting?.action?.();
    } finally {
      waiting?.settle();
    }
  }, []);

  return {
    hasLogo,
    open,
    reason,
    vendorId: vendor?.id ?? null,
    businessName: vendor?.business_name ?? 'Your business',
    logoUrl: vendor?.primary_image_url ?? null,
    onboardingPhotoUrl: vendor?.profile_image_url ?? null,
    requireLogo,
    openDialog,
    cancel,
    complete,
  };
}

export type LogoGateState = ReturnType<typeof useLogoGateState>;
