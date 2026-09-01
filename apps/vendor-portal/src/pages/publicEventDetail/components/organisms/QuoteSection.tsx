import { Alert, SectionCard, Skeleton, Stack } from '@sinnapi/ui';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import type { PublicEventRequirementModel, VendorEventQuotationModel } from '@/lib/types';
import type { QuoteStanding } from '../../schema';
import QuoteStandingCallout from '../molecules/QuoteStandingCallout';
import QuoteSummaryCard from '../molecules/QuoteSummaryCard';

type Props = {
  eventId: string;
  quotes: {
    rows: VendorEventQuotationModel[];
    isLoading: boolean;
    error: unknown;
    standing: QuoteStanding;
  };
  /** The plan, so a quote can name the line it answers. */
  requirements: PublicEventRequirementModel[];
  actionable: boolean;
  interested: boolean;
  canExpressInterest: boolean;
};

/**
 * This vendor's quotes for the event, and the way back into the one that needs
 * finishing.
 *
 * A SUMMARY, NOT A BUILDER, and deliberately. Pricing a quote is a form of line
 * rows that needs every pixel it can get, and it already exists — with its own
 * totals, advance terms, validity, send action and status trail — at
 * `/quotations/:id`. A second copy of it here would be a second place for those
 * rules to live, and the two would drift on the first change to either. So the
 * rows link out, and the deep link lands the vendor exactly where they were
 * always going to have to finish.
 *
 * The callout repeats at the top of this tab rather than only on Overview: a
 * vendor who came straight here from the tab bar must still be told that the
 * quote listed below has never been sent.
 */
export default function QuoteSection({
  eventId,
  quotes,
  requirements,
  actionable,
  interested,
  canExpressInterest,
}: Props) {
  const byId = new Map(requirements.map((row) => [row.id, row]));

  return (
    <Stack spacing={3}>
      <SectionCard title="Where you stand" icon={<RequestQuoteOutlinedIcon />}>
        <QuoteStandingCallout
          eventId={eventId}
          standing={quotes.standing}
          actionable={actionable}
          interested={interested}
          canExpressInterest={canExpressInterest}
        />
      </SectionCard>

      {quotes.error ? (
        <Alert severity="error">
          {quotes.error instanceof Error ? quotes.error.message : 'Could not load your quotes.'}
        </Alert>
      ) : quotes.isLoading ? (
        <SectionCard title="Your quotes" icon={<RequestQuoteOutlinedIcon />}>
          <Stack spacing={2}>
            {[0, 1].map((row) => (
              <Skeleton key={row} variant="rounded" height={88} />
            ))}
          </Stack>
        </SectionCard>
      ) : (
        quotes.rows.length > 0 && (
          <SectionCard
            title="Your quotes"
            icon={<RequestQuoteOutlinedIcon />}
            subtitle="Open one to price it, send it, or see what the client said"
          >
            <Stack spacing={2}>
              {quotes.rows.map((quotation) => (
                <QuoteSummaryCard
                  key={quotation.id}
                  quotation={quotation}
                  requirement={
                    quotation.requirement_id ? (byId.get(quotation.requirement_id) ?? null) : null
                  }
                />
              ))}
            </Stack>
          </SectionCard>
        )
      )}
    </Stack>
  );
}
