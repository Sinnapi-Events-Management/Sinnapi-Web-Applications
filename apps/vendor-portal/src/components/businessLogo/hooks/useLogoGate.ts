import { createContext, useContext } from 'react';
import type { LogoGateState } from './useLogoGateState';

export const LogoGateContext = createContext<LogoGateState | null>(null);

/**
 * Guard an action that sends a document to a client:
 *
 *   const { requireLogo } = useLogoGate();
 *   onClick={() => requireLogo('invoice', issue)}
 *
 * Runs `issue` now if the vendor has a logo; otherwise asks for one first and
 * runs it straight after.
 */
export function useLogoGate(): Pick<LogoGateState, 'hasLogo' | 'requireLogo' | 'openDialog'> {
  const ctx = useContext(LogoGateContext);
  if (!ctx) throw new Error('useLogoGate must be used within LogoGateProvider');
  return ctx;
}
