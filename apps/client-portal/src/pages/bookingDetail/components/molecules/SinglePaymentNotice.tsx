import { Stack, Typography } from '@sinnapi/ui';
import PaymentsIcon from '@mui/icons-material/Payments';
import { formatMoney } from '@/lib/config';

type Props = {
  /** The full charge — agreed amount plus commission plus the processing fee. */
  grossAmount: number | null;
  currency: string | null;
};

/**
 * That this is one payment, for the whole amount, now.
 *
 * Worth its own component because the page around it can be read the other way.
 * The booking carries an "advance" and a "balance", the breakdown shows them as
 * separate lines with separate dates, and a client scanning that has every
 * reason to conclude they are being offered a deposit now and the rest later.
 * They are not: the split describes when Sinnapi releases money *to the
 * vendor*, and the client pays all of it up front.
 *
 * Getting that wrong is not a cosmetic misunderstanding — it is a client who
 * budgeted for a third of the amount arriving at a hosted checkout asking for
 * all of it, which is where payments get abandoned. So the sentence is stated
 * plainly and next to the figure, rather than left to be inferred.
 */
export default function SinglePaymentNotice({ grossAmount, currency }: Props) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <PaymentsIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
      <Typography variant="body2" color="text.secondary">
        {grossAmount != null ? (
          <>
            This is paid as <strong>one payment of {formatMoney(grossAmount, currency)}</strong> —
            the amount agreed with your vendor, plus Sinnapi&rsquo;s service fee and the payment
            provider&rsquo;s processing fee.
          </>
        ) : (
          <>
            This is paid as <strong>one payment</strong> covering the full amount — what you agreed
            with your vendor, plus Sinnapi&rsquo;s service fee and the payment provider&rsquo;s
            processing fee.
          </>
        )}{' '}
        We do not offer instalments. The advance and balance shown below are when we release money
        to your vendor, not separate payments from you.
      </Typography>
    </Stack>
  );
}
