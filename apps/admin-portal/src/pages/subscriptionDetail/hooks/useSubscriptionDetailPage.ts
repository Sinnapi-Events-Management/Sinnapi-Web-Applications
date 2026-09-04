import { useUrlTab } from '@sinnapi/ui/router';
import { SUBSCRIPTION_TABS } from '../schema';
import { useSubscriptionDetail } from './useSubscriptionDetail';

/**
 * The page's own state, which is only "which section is open" — kept in the
 * URL so a link pasted from a Finance note lands on the payments tab rather
 * than on the page and a description of where to click.
 */
export function useSubscriptionDetailPage() {
  const detail = useSubscriptionDetail();
  const { tab, setTab } = useUrlTab(SUBSCRIPTION_TABS);

  return { ...detail, tab, setTab };
}
