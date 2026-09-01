import { useMediaQuery, useTheme } from '@sinnapi/ui/system';
import { useUrlTab } from '@sinnapi/ui/router';
import { VENDOR_DETAIL_TABS } from '../schema';
import { useVendorDetail } from './useVendorDetail';

/**
 * The page's own state: which section is open, and where the engage panel goes.
 *
 * The open section lives in the URL so a reload, the back button, or a link
 * pasted into a planning thread all land on the section that was being read —
 * "their calendar is here" has to survive being sent to someone.
 *
 * `isCompact` decides where the price-and-actions panel renders rather than
 * *whether* a second copy of it does. Two copies toggled with `display` would
 * mean two mounted quote dialogs, two message-vendor mutations and two sets of
 * ids, one of which is always hidden — so the page picks one and mounts it once.
 *
 * Everything else stays where it was: `useVendorDetail` owns the profile read,
 * and each section below owns its own.
 */
export function useVendorDetailPage() {
  const detail = useVendorDetail();
  const { tab, setTab } = useUrlTab(VENDOR_DETAIL_TABS);

  const theme = useTheme();
  // `noSsr` because the portal is a client-rendered SPA with no server pass to
  // match: without it the first paint assumes the query is false, so a phone
  // renders the desktop layout and then swaps it, which is a visible jump of
  // the whole page on exactly the devices least able to absorb one.
  const isCompact = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  return { ...detail, tab, setTab, isCompact };
}
