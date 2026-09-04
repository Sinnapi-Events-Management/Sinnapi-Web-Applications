import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  JsonBlock,
  SectionCard,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@sinnapi/ui';
import TimelineIcon from '@mui/icons-material/Timeline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePaymentTrace } from '@/hooks/queries';
import { formatDateTime } from '@/lib/config';
import { ACTOR_KINDS, type ActorKindKey } from '@/lib/audit';
import type { PaymentTraceRow } from '@/lib/types';
import { TRACE_STREAMS, traceActor, traceAsText } from '../../schema/trace';

type Props = {
  paymentId: string;
  correlationId: string | null;
};

/**
 * The whole life of one transaction on a single ordered axis.
 *
 * This is the page's primary view because it is the question people open the
 * page to ask. Until 20260904 it could not be answered: the story lived in
 * seven tables joined by four different keys — and two of those keys did not
 * exist, because an IPN's log row and its idempotency-gate row are written
 * *before* the payment is identified, so `get_payment_admin` had to
 * reverse-engineer the link from `payload->>'orderTrackingId'`. The audit rows
 * in the middle of the story named nobody at all, because `tg_write_audit`
 * wrote `auth.uid()` and every webhook and sweep runs with none.
 *
 * Every row therefore shows `actor_kind`. That is the column that separates
 * three completely different incidents which used to render identically: a
 * Pesapal IPN applying the provider's answer, the hourly sweep resolving a lost
 * webhook, and a Finance admin moving the payment by hand.
 */
export default function TraceSection({ paymentId, correlationId }: Props) {
  const { data, isLoading, error } = usePaymentTrace(correlationId);
  const [copied, setCopied] = useState(false);
  const [openRow, setOpenRow] = useState<number | null>(null);

  // Memoised rather than `data ?? []` inline: a fresh array each render would
  // re-run the actor-kind derivation below on every keystroke elsewhere.
  const rows = useMemo(() => data ?? [], [data]);

  // Which automated things touched this transaction at all. Stated up front
  // because it is the finding, and it is easy to miss in forty rows: a payment
  // carrying both a `psp_webhook` row and a `reconciliation` row was settled
  // twice over, and that is worth noticing before reading the detail.
  const kinds = useMemo(
    () => [...new Set(rows.map((r) => r.actor_kind).filter((k): k is ActorKindKey => Boolean(k)))],
    [rows],
  );

  async function copy() {
    if (!correlationId || rows.length === 0) return;
    try {
      await navigator.clipboard.writeText(traceAsText(rows, { correlationId, paymentId }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <SectionCard
      title="Transaction trace"
      icon={<TimelineIcon />}
      subtitle="Every change, provider message, delivery, ledger posting, escrow event and notification that shares this payment's trace id — in the order it happened, with who or what caused each one."
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          {correlationId && (
            <Tooltip title="The id that ties this transaction's rows together across every table">
              <Chip
                size="small"
                variant="outlined"
                label={correlationId}
                sx={{ fontFamily: 'monospace', fontSize: 11 }}
              />
            </Tooltip>
          )}
          <Button
            size="small"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={copy}
            disabled={rows.length === 0}
          >
            {copied ? 'Copied' : 'Copy as text'}
          </Button>
        </Stack>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load the trace.'}
        </Alert>
      )}

      {!correlationId ? (
        <Typography variant="body2" color="text.secondary">
          This payment has no trace id. Only payments created before the correlation id was
          introduced can look like this, and the backfill gave those the payment&apos;s own id — so
          if you are seeing this, the row was written by something that bypassed the payments
          trigger.
        </Typography>
      ) : isLoading ? (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Assembling the trace…
          </Typography>
        </Stack>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nothing is recorded against this trace id. A checkout that was opened and never touched
          again looks like this — as does a payment whose rows predate the correlation id.
        </Typography>
      ) : (
        <>
          {kinds.length > 0 && (
            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="caption" color="text.secondary">
                Acted on by:
              </Typography>
              {kinds.map((k) => (
                <Tooltip key={k} title={ACTOR_KINDS[k]?.description ?? ''}>
                  <Chip
                    size="small"
                    label={ACTOR_KINDS[k]?.label ?? k}
                    color={ACTOR_KINDS[k]?.accent ?? 'default'}
                    variant="outlined"
                    sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                  />
                </Tooltip>
              ))}
            </Stack>
          )}

          {/* Its own horizontal scroller: a trace is wide, and the page body
              must never scroll sideways. */}
          <Box sx={{ overflowX: 'auto' }}>
            <Stack spacing={0} sx={{ minWidth: 720 }}>
              {rows.map((row, i) => (
                <TraceRow
                  key={`${row.stream}-${row.occurred_at}-${i}`}
                  row={row}
                  open={openRow === i}
                  onToggle={() => setOpenRow(openRow === i ? null : i)}
                />
              ))}
            </Stack>
          </Box>
        </>
      )}
    </SectionCard>
  );
}

/**
 * One event. Collapsed by default — a trace is read as a sequence first, and
 * every payload inlined at once is a wall nobody scans — expanding to the raw
 * detail for the row an investigator has settled on.
 */
function TraceRow({
  row,
  open,
  onToggle,
}: {
  row: PaymentTraceRow;
  open: boolean;
  onToggle: () => void;
}) {
  const stream = TRACE_STREAMS[row.stream] ?? { label: row.stream, hint: '' };
  const accent = row.actor_kind ? ACTOR_KINDS[row.actor_kind as ActorKindKey]?.accent : undefined;

  return (
    <Box
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        py: 1.25,
        '&:first-of-type': { borderTop: 0 },
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        onClick={onToggle}
        sx={{ cursor: 'pointer' }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ minWidth: 150, fontVariantNumeric: 'tabular-nums', pt: 0.25 }}
        >
          {row.occurred_at ? formatDateTime(row.occurred_at) : '—'}
        </Typography>

        <Tooltip title={stream.hint}>
          <Chip
            size="small"
            label={stream.label}
            variant="outlined"
            sx={{
              height: 20,
              minWidth: 88,
              '& .MuiChip-label': { px: 0.75, fontSize: 11 },
            }}
          />
        </Tooltip>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
            {row.label}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: accent ? `${accent}.main` : 'text.secondary' }}
          >
            {traceActor(row)}
          </Typography>
        </Box>

        <ExpandMoreIcon
          fontSize="small"
          sx={{
            color: 'text.disabled',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 150ms',
          }}
        />
      </Stack>

      {open && (
        <Box
          sx={{
            mt: 1,
            ml: { xs: 0, sm: '166px' },
            p: 1.5,
            borderRadius: 1,
            bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
          }}
        >
          <JsonBlock value={row.detail} maxHeight={280} emptyMessage="No detail recorded." />
        </Box>
      )}
    </Box>
  );
}
