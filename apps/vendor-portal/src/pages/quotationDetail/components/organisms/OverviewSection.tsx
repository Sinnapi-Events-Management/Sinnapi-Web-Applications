import { SectionGrid } from '@sinnapi/ui';
import type { DirectoryProfile, EventRefModel, QuotationDetailModel } from '@/lib/types';
import QuotationRequestCard from './QuotationRequestCard';
import QuotationFactsCard from './QuotationFactsCard';

type Props = {
  quotation: QuotationDetailModel;
  client: DirectoryProfile | null;
  event: EventRefModel | null;
};

/**
 * The default section: what was asked for, and the record of the asking.
 *
 * The brief leads. A vendor opening a quote wants the client's own words before
 * anything else, and reading them is what the rest of the page is in service
 * of — it used to sit above the builder, one tab away from where a vendor
 * lands, which put the question after the answer.
 *
 * Two columns from `md` up rather than one long one. The brief takes the wider
 * track because it is prose of unknown length; the facts are short labelled
 * rows and read fine narrow. When there is no brief the facts take the full
 * width rather than leaving its column empty.
 *
 * This section is also where the hero's condensed mobile view sends its missing
 * facts: the valid-until date, the event and the sent stamp are all rows here,
 * so nothing dropped from the phone hero is actually lost.
 */
export default function OverviewSection({ quotation, client, event }: Props) {
  const hasRequest = Boolean(quotation.request_details);

  return (
    <SectionGrid template={{ xs: '1fr', md: hasRequest ? '7fr 5fr' : '1fr' }}>
      {quotation.request_details && (
        <QuotationRequestCard requestDetails={quotation.request_details} />
      )}
      <QuotationFactsCard quotation={quotation} client={client} event={event} />
    </SectionGrid>
  );
}
