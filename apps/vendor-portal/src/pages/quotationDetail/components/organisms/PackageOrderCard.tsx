import {
  Alert,
  Button,
  QuotationLineItems,
  SectionCard,
  Skeleton,
  Stack,
  type QuotationPricing,
} from '@sinnapi/ui';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import PackageOrderLocks from '../molecules/PackageOrderLocks';
import PackageApprovalDialog from '../molecules/PackageApprovalDialog';
import { usePackageQuoteApproval } from '../../hooks/usePackageQuoteApproval';
import { one } from '@/lib/rel';
import type { QuotationDetailModel, QuotationItemModel } from '@/lib/types';

type Props = {
  quotation: QuotationDetailModel;
  items: QuotationItemModel[];
  pricing: QuotationPricing;
};

/**
 * A package order awaiting the vendor's answer.
 *
 * This is what stands in for the builder on a `quote_origin = 'package'` quote,
 * and the substitution is the point: there is nothing to build. The client
 * bought a published tier, the server priced it, and the only question left is
 * yes or no.
 *
 * The breakdown is shown FIRST and in full — the same `QuotationLineItems` the
 * vendor sees on a quote they sent themselves — because a vendor cannot
 * sensibly approve a figure they have to click through to see. The constraints
 * come underneath it, and the two buttons last.
 *
 * Once answered this card disappears and `QuotationQuoteCard`'s ordinary
 * breakdown takes over, which is correct: after the decision the order is a
 * record like any other quote, and it should not keep offering buttons that
 * would be refused.
 */
export default function PackageOrderCard({ quotation, items, pricing }: Props) {
  const approval = usePackageQuoteApproval(quotation);
  const currency = quotation.currency ?? 'UGX';
  const eventType = one<{ id: string; name: string }>(quotation.event_types);

  return (
    <SectionCard
      title="Package order awaiting your approval"
      icon={<ShoppingBagOutlinedIcon />}
      subtitle="The client ordered this at your published price. Approve it or decline it."
    >
      <Stack spacing={2.5}>
        {approval.terms?.package_changed && (
          <Alert severity="warning">
            You have edited this package since the client ordered it, so it can no longer be
            approved as published. Decline this order and send them a fresh quote instead.
          </Alert>
        )}

        {pricing.isPriced && <QuotationLineItems items={items} pricing={pricing} />}

        {approval.isTermsLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : (
          <PackageOrderLocks
            currency={currency}
            lockedSubtotal={approval.terms?.locked_subtotal ?? null}
            lockedFloor={approval.terms?.locked_discount_floor ?? null}
            eventDate={quotation.event_date}
            eventTypeName={eventType?.name ?? null}
            eventAddress={quotation.event_address}
          />
        )}

        {/* Full-width and stacked on a phone, where a pair of side-by-side
            buttons ends up too narrow to read and too close to mis-tap. Approve
            leads because it is the expected answer to an order placed at the
            vendor's own published price. */}
        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          spacing={1.5}
          justifyContent="flex-end"
        >
          <Button
            color="error"
            startIcon={<CloseIcon />}
            onClick={() => approval.request('decline')}
            fullWidth={false}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Decline
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => approval.request('approve')}
            disabled={approval.terms?.package_changed}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Approve order
          </Button>
        </Stack>
      </Stack>

      <PackageApprovalDialog
        action={approval.pending}
        reference={quotation.reference_no}
        currency={currency}
        reason={approval.reason}
        onReasonChange={approval.setReason}
        extraDiscount={approval.extraDiscount}
        onExtraDiscountChange={approval.setExtraDiscount}
        isSweetening={approval.isSweetening}
        onSweeteningChange={approval.setSweetening}
        isExtraValid={approval.isExtraValid}
        projection={approval.projection}
        currentTotal={approval.terms?.current_total ?? null}
        wouldZeroTheTotal={approval.wouldZeroTheTotal}
        canConfirm={approval.canConfirm}
        isBusy={approval.isBusy}
        error={approval.error}
        onCancel={approval.cancel}
        onConfirm={() => void approval.confirm()}
      />
    </SectionCard>
  );
}
