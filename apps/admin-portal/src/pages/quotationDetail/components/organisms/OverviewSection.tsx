import { Box, SectionGrid } from '@sinnapi/ui';
import type { AdminQuotationDetailModel } from '@/lib/types';
import QuotationFactsCard from './QuotationFactsCard';
import QuotationPartiesCard from './QuotationPartiesCard';
import QuotationRequestCard from './QuotationRequestCard';

type Props = { quotation: AdminQuotationDetailModel };

/**
 * The default section: what this quote is, who it is between, and what was
 * asked for.
 *
 * The facts and the parties sit side by side from `md` up because together they
 * are the whole answer to "what am I looking at and who do I call" — the two
 * things an operator opening a support thread needs before reading anything
 * else. The facts take the wider track: their values are timestamps and an
 * event title, against two names and their contact details.
 *
 * The brief spans both columns underneath rather than taking the next cell. It
 * is prose of unknown length and the only unstructured text on the page, and
 * half a row is exactly where a paragraph starts wrapping every line. A quote
 * raised without a written brief has no third card at all, and the grid closes
 * up rather than leaving a gap where it would have been.
 */
export default function OverviewSection({ quotation }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '7fr 5fr' }}>
      <QuotationFactsCard quotation={quotation} />
      <QuotationPartiesCard quotation={quotation} />
      {quotation.request_details && (
        <Box sx={{ gridColumn: { md: '1 / -1' }, minWidth: 0 }}>
          <QuotationRequestCard requestDetails={quotation.request_details} />
        </Box>
      )}
    </SectionGrid>
  );
}
