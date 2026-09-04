import { useSearchParams } from 'react-router-dom';
import { useUrlTab } from '@sinnapi/ui/router';
import { PAYMENT_TABS, normalisePaymentTab } from '../schema';
import { usePaymentDetail } from './usePaymentDetail';

/**
 * The page's own state, which is only "which section is open" — kept in the
 * URL so a link pasted from a reconciliation note lands on the payloads or
 * exceptions tab rather than on the page and a description of where to click.
 *
 * The raw parameter is read alongside `useUrlTab` to honour `?tab=timeline`,
 * which is what the deliveries section was called until 20260904. Those links
 * are already in reconciliation notes and support tickets, and `useUrlTab`
 * alone would silently drop them onto the default tab.
 */
export function usePaymentDetailPage() {
  const detail = usePaymentDetail();
  const [searchParams] = useSearchParams();
  const { tab, setTab } = useUrlTab(PAYMENT_TABS);
  const aliased = normalisePaymentTab(searchParams.get('tab'));

  return { ...detail, tab: aliased ?? tab, setTab };
}
