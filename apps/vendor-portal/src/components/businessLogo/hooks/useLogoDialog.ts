import { useCallback } from 'react';
import { useBusinessLogo } from './useBusinessLogo';
import type { LogoGateState } from './useLogoGateState';

/**
 * The dialog's own logic: the upload, the "use my onboarding photo" shortcut,
 * and when Continue may be pressed.
 *
 * Continue never fires on its own once the upload lands — the vendor sees
 * their logo on the document preview first, then chooses to carry on. A
 * quotation going out the instant a file is picked would be a surprise.
 */
export function useLogoDialog(gate: LogoGateState) {
  const upload = useBusinessLogo({
    vendorId: gate.vendorId,
    currentUrl: gate.logoUrl,
    onboardingPhotoUrl: gate.onboardingPhotoUrl,
  });

  const { adoptFromUrl } = upload;
  const reuse = useCallback(() => {
    if (gate.onboardingPhotoUrl) void adoptFromUrl(gate.onboardingPhotoUrl);
  }, [gate.onboardingPhotoUrl, adoptFromUrl]);

  const logoUrl = upload.displayUrl;

  return {
    upload,
    logoUrl,
    /** Offered only while there is no logo and an onboarding photo exists. */
    canReuse: !!gate.onboardingPhotoUrl && !logoUrl,
    reuse,
    canContinue: !!gate.logoUrl && !upload.busy,
  };
}
