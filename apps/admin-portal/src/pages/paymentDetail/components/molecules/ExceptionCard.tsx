import { Link as RouterLink } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Divider,
  InfoRow,
  JsonBlock,
  SectionCard,
  Stack,
  StatusChip,
  Typography,
} from '@sinnapi/ui';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RuleIcon from '@mui/icons-material/Rule';
import { formatDateTime, formatMoney } from '@/lib/config';
import type { PaymentExceptionModel } from '@/lib/types';
import { KIND_LABEL } from '@/pages/reconciliation/schema';

type Props = {
  exception: PaymentExceptionModel;
  /** Whether this admin may work the item, not merely read it. */
  canReconcile: boolean;
};

const OPEN = new Set(['open', 'investigating']);

/**
 * One reconciliation finding against this payment, with the way onward to
 * working it.
 *
 * The same facts the queue shows, plus the resolution trail and the raw
 * metadata the sweep attached — which is where the sweep put the other ids it
 * compared (the kept payment on a superseded checkout, the confirmed amount on
 * a mismatch). "Work item" deep-links into the reconciliation queue with this
 * item already open, so a Finance admin reading the finding here does not
 * have to find it again there.
 */
export default function ExceptionCard({ exception: x, canReconcile }: Props) {
  const isOpen = OPEN.has(x.status);
  const critical = x.severity === 'critical';

  return (
    <SectionCard
      title={KIND_LABEL[x.kind] ?? x.kind}
      icon={<RuleIcon />}
      accent={critical ? 'error' : isOpen ? 'warning' : 'success'}
      action={
        <Stack direction="row" spacing={0.75} alignItems="center">
          {critical && <Chip size="small" color="error" label="Critical" />}
          <StatusChip status={x.status} />
        </Stack>
      }
    >
      <Stack spacing={2}>
        {x.detail && (
          <Typography variant="body2" color="text.secondary">
            {x.detail}
          </Typography>
        )}

        <div>
          <InfoRow label="Expected" value={formatMoney(x.expected, 'UGX')} />
          <InfoRow label="Actual" value={formatMoney(x.actual, 'UGX')} />
          <InfoRow label="Seen" value={`${x.occurrences}×`} />
          <InfoRow label="First seen" value={formatDateTime(x.first_seen_at)} />
          <InfoRow label="Last seen" value={formatDateTime(x.last_seen_at)} />
          <InfoRow label="Exception ID" value={x.id} mono copyValue={x.id} />
        </div>

        {x.resolved_at && (
          <>
            <Divider />
            <div>
              <InfoRow label="Worked by" value={x.resolved_by ?? '—'} />
              <InfoRow label="Worked at" value={formatDateTime(x.resolved_at)} />
              <InfoRow label="Notes" value={x.resolution_notes ?? '—'} />
            </div>
          </>
        )}

        {x.metadata && Object.keys(x.metadata).length > 0 && (
          <Accordion disableGutters variant="outlined" sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={600}>
                What the sweep compared
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <JsonBlock value={x.metadata} label="Metadata" maxHeight={280} />
            </AccordionDetails>
          </Accordion>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {canReconcile && isOpen ? (
            <Button
              component={RouterLink}
              to={`/reconciliation?item=${x.id}`}
              variant="contained"
              size="small"
            >
              Work item
            </Button>
          ) : (
            <Button component={RouterLink} to="/reconciliation" variant="text" size="small">
              Open reconciliation queue
            </Button>
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
