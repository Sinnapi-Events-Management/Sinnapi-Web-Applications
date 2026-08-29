import { useUrlTab } from '@sinnapi/ui/router';
import { QUOTATION_TABS } from '../schema';
import { useQuotationDetail } from './useQuotationDetail';

/**
 * The page's own state, which is only ever "which section is open" — kept in
 * the URL so a reload, a back button or a link pasted into a support thread all
 * land on the section that was being read. That last one is the reason it is in
 * the URL at all: an operator handing a quotation to a colleague sends them the
 * tab, not the page and a description of where to click.
 *
 * Everything else stays where it was: `useQuotationDetail` owns the read and
 * every derived figure, and the timeline card owns its own. Sections
 * deliberately do not report whether they have anything to show, so no tab can
 * disappear underneath an operator mid-read — a section with nothing in it says
 * so instead.
 */
export function useQuotationDetailPage() {
  const detail = useQuotationDetail();
  const { tab, setTab } = useUrlTab(QUOTATION_TABS);

  return { ...detail, tab, setTab };
}
