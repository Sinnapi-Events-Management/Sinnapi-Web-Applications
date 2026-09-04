import { SectionCard, Stack, Typography } from '@sinnapi/ui';
import CodeIcon from '@mui/icons-material/Code';
import type { PaymentLogModel } from '@/lib/types';
import PayloadAccordion from '../molecules/PayloadAccordion';

type Props = { logs: PaymentLogModel[] };

/**
 * The raw bodies: every request we sent the provider, every response it gave,
 * and every IPN it pushed, newest first and each collapsed to a headline.
 *
 * Shown verbatim. What the provider actually said is the evidence an
 * investigation turns on, and these rows are already readable only under
 * `payments.read`; the collapsed form is what keeps a hundred retries from
 * burying the one that mattered.
 */
export default function PayloadsSection({ logs }: Props) {
  return (
    <SectionCard
      title="Raw provider traffic"
      icon={<CodeIcon />}
      subtitle="Everything kept from the wire for this payment, newest first. Open a row to read the body."
    >
      {logs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nothing has been logged for this payment. The checkout request is written when the
          provider order is created, so an empty log means that call never completed.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {logs.map((log) => (
            <PayloadAccordion key={log.id} log={log} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
