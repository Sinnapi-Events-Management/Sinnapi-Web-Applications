import { Alert, InfoRow, Link, SectionCard, Stack, StatusChip } from '@sinnapi/ui';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { PaymentAdminDetailModel } from '@/lib/types';
import { methodLabel, providerLabel, purposeLabel } from '@/pages/payments/schema';

type Props = { payment: PaymentAdminDetailModel };

/**
 * The payment row itself, as labelled facts.
 *
 * Every identifier is copyable and monospace: the provider reference is what
 * the PSP's support desk asks for, the payment id is what our own logs and
 * exceptions quote, and the idempotency keys are how a duplicate charge is
 * proved or ruled out. An investigator should never have to select text out
 * of a table cell to paste one.
 */
export default function PaymentFactsCard({ payment: p }: Props) {
  const converted = p.base_currency && p.base_currency !== p.currency && p.base_amount != null;

  return (
    <SectionCard
      title="Payment"
      icon={<ReceiptLongIcon />}
      action={<StatusChip status={p.status} />}
    >
      <Stack spacing={2}>
        {p.failure_reason && (
          <Alert severity={p.status === 'failed' ? 'error' : 'warning'} variant="outlined">
            {p.failure_reason}
          </Alert>
        )}

        <div>
          <InfoRow label="Amount" value={formatMoney(p.amount, p.currency)} />
          {converted && (
            <InfoRow
              label={`In ${p.base_currency}`}
              value={`${formatMoney(p.base_amount, p.base_currency)}${
                p.fx_rate != null ? ` @ ${p.fx_rate}` : ''
              }`}
            />
          )}
          <InfoRow label="Purpose" value={purposeLabel(p.purpose)} />
          <InfoRow label="Provider" value={providerLabel(p.provider)} />
          <InfoRow label="Method" value={methodLabel(p.provider_method)} />
          <InfoRow
            label="Provider reference"
            value={p.provider_ref}
            mono
            copyValue={p.provider_ref ?? undefined}
          />
          <InfoRow label="Created" value={formatDateTime(p.created_at)} />
          <InfoRow label="Paid" value={p.paid_at ? formatDateTime(p.paid_at) : 'Not paid'} />
          <InfoRow label="Last updated" value={formatDateTime(p.updated_at)} />
        </div>

        <div>
          <InfoRow label="Payment ID" value={p.id} mono copyValue={p.id} />
          <InfoRow
            label="Platform key"
            value={p.idempotency_key}
            mono
            copyValue={p.idempotency_key}
          />
          {p.client_idempotency_key && (
            <InfoRow
              label="Client key"
              value={p.client_idempotency_key}
              mono
              copyValue={p.client_idempotency_key}
            />
          )}
          {p.checkout_url && (
            <InfoRow
              label="Checkout page"
              value={
                <Link
                  href={p.checkout_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                >
                  Open hosted checkout
                </Link>
              }
              copyValue={p.checkout_url}
            />
          )}
        </div>
      </Stack>
    </SectionCard>
  );
}
