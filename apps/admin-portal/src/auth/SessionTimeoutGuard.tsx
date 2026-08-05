import { SessionTimeoutDialog } from '@sinnapi/ui';
import { useSessionTimeout } from '@/auth/hooks/useSessionTimeout';

/**
 * Watches for an idle session and, after 5 minutes of inactivity, shows a
 * 60-second countdown before signing the user out. Mounted once at the root of
 * the app so it covers every authenticated route, and inert while there is no
 * session — the hook only tracks activity once one is held.
 */
export default function SessionTimeoutGuard() {
  const sessionTimeout = useSessionTimeout();
  return <SessionTimeoutDialog {...sessionTimeout} />;
}
