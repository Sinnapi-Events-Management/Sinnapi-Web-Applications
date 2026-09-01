import { Alert, AlertTitle, Typography } from '@sinnapi/ui';
import type { QuotationDetailModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  vendorName: string | null;
};

/**
 * What a package order is waiting on, said in the client's terms.
 *
 * Without this the page is actively misleading. A package order sits at
 * `requested` — the same status a bespoke brief sits at — and every existing
 * piece of copy for that status says some version of "the vendor will send you
 * a price". Here the price is already on screen, already agreed, and already
 * itemised below. A client reading "awaiting their quote" over a full breakdown
 * concludes that either the number is provisional or the page is broken.
 *
 * The reassurance is specific rather than warm: "they cannot raise it" is the
 * guarantee 0903b actually provides, and it is the one fact that makes waiting
 * comfortable. A vaguer "don't worry" would be worth less and would also be a
 * promise nothing enforces.
 *
 * Renders nothing outside the package flow, and nothing once the order has been
 * answered — at that point the status chip and the booking card say what is
 * true, and a third voice repeating it is noise.
 */
export default function PackageOrderStatusCallout({ quotation, vendorName }: Props) {
  if (quotation.quote_origin !== 'package') return null;

  const vendor = vendorName ?? 'The vendor';

  if (quotation.status === 'requested') {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Waiting for {vendor} to confirm</AlertTitle>
        <Typography variant="body2">
          You ordered this package at the price below, and that price is held for you. {vendor} can
          confirm it as it stands or give you a bigger discount — they cannot raise the total or
          change what is included. As soon as they confirm, you pick your date.
        </Typography>
      </Alert>
    );
  }

  if (quotation.status === 'accepted') {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        <AlertTitle>{vendor} confirmed your order</AlertTitle>
        <Typography variant="body2">
          The price and the package are agreed. The last step is your booking — pick the date and
          how you would like to pay.
        </Typography>
      </Alert>
    );
  }

  if (quotation.status === 'declined') {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <AlertTitle>{vendor} could not take this on</AlertTitle>
        <Typography variant="body2">
          Nothing was charged, and any discount you claimed has been released. Their reason is on
          the record below — you can order again for another date, or ask them for a bespoke quote.
        </Typography>
      </Alert>
    );
  }

  return null;
}
