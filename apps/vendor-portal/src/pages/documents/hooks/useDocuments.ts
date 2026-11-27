import { useSearchParams } from 'react-router-dom';
import { isDocumentsTab, type DocumentsTab } from '../schema';

/**
 * Which tab is open, kept in the URL (`?tab=receipts`) so a link from a
 * receipt back to "Receipts", or a refresh, lands on the same tab.
 */
export function useDocuments() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: DocumentsTab = isDocumentsTab(raw) ? raw : 'invoices';

  return {
    tab,
    setTab: (next: DocumentsTab) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === 'invoices') p.delete('tab');
          else p.set('tab', next);
          return p;
        },
        { replace: true },
      ),
  };
}
