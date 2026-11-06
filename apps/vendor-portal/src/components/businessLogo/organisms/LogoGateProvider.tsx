import { LogoGateContext } from '../hooks/useLogoGate';
import { useLogoGateState } from '../hooks/useLogoGateState';
import LogoRequiredDialog from './LogoRequiredDialog';

/**
 * Owns the one logo-required dialog for the whole portal. Any button that
 * sends a document calls `useLogoGate().requireLogo(...)`; the dialog lives
 * here so no page has to mount its own.
 */
export default function LogoGateProvider({ children }: { children: React.ReactNode }) {
  const gate = useLogoGateState();
  return (
    <LogoGateContext.Provider value={gate}>
      {children}
      <LogoRequiredDialog gate={gate} />
    </LogoGateContext.Provider>
  );
}
