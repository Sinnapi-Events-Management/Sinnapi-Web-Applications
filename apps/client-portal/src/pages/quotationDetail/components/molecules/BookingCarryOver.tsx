import { Stack, InfoRow, advanceTermsSummary, type QuotationPricing } from '@sinnapi/ui';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaymentsIcon from '@mui/icons-material/Payments';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { formatMoney } from '@/lib/config';
import type { QuotationDetailModel, VendorRefModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  pricing: QuotationPricing;
};

/**
 * What the booking inherits from the quote, shown above the fields that ask for
 * everything else.
 *
 * These are read-only because they are not the client's to change here: the
 * server takes the vendor, the amount and the advance schedule off the
 * quotation and ignores anything a caller sends for them. Showing them as text
 * says that — a disabled input would imply there is a state in which they could
 * be edited, and an omission would leave the client agreeing to a price the
 * form never mentioned.
 *
 * The amount is the page's resolved total, not the raw column, so what the
 * client reads here is the same figure the breakdown above showed them and the
 * same one the server is about to write onto the booking.
 */
export default function BookingCarryOver({ quotation: q, vendor, pricing }: Props) {
  const terms = advanceTermsSummary(q.advance_rate, q.advance_release_days_before);

  return (
    <Stack>
      <InfoRow
        label="Vendor"
        icon={<StorefrontIcon />}
        value={vendor?.business_name ?? 'Your vendor'}
      />
      <InfoRow
        label="Agreed amount"
        icon={<PaymentsIcon />}
        value={formatMoney(pricing.total, pricing.currency)}
      />
      {terms && <InfoRow label="Advance terms" icon={<HandshakeIcon />} value={terms} />}
    </Stack>
  );
}
