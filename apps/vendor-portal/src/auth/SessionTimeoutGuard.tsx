import { SessionTimeoutDialog } from '@sinnapi/ui';
import { useSessionTimeout } from '@/auth/hooks/useSessionTimeout';

/**
 * Watches for an idle session and, after 30 minutes of inactivity, shows a
 * 60-second countdown before signing the user out. Mounted once at the root of
 * the app so it covers every authenticated route — including the forced
 * password change, which sits outside the app shell — and inert while there is
 * no session, since the hook only tracks activity once one is held.
 */
export default function SessionTimeoutGuard() {
  const sessionTimeout = useSessionTimeout();
  return <SessionTimeoutDialog {...sessionTimeout} />;
}
