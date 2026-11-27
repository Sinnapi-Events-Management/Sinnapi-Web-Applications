import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Shows a confirmation handed over in the navigation state
 * (`navigate(to, { state: { notice } })`) once, then clears it so a refresh
 * or a back-navigation does not repeat it.
 *
 * Used when an action ends on a different page from the one it started on —
 * "Invoice SNP-INV-… issued" is said by the invoice's page, not the editor
 * that just unmounted.
 */
export function useLocationNotice(show: (message: string) => void) {
  const location = useLocation();
  const navigate = useNavigate();
  const notice = (location.state as { notice?: string } | null)?.notice;

  useEffect(() => {
    if (!notice) return;
    show(notice);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [notice, show, navigate, location.pathname, location.search]);
}
