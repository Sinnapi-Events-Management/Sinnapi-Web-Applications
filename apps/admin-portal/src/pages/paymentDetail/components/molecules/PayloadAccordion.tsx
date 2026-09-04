import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  JsonBlock,
  Stack,
  Tooltip,
  Typography,
} from '@sinnapi/ui';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GppBadIcon from '@mui/icons-material/GppBad';
import { formatDateTime } from '@/lib/config';
import type { PaymentLogModel } from '@/lib/types';

type Props = { log: PaymentLogModel };

/** Traffic direction → chip colour: what we sent, what came back, what they pushed. */
const DIRECTION_COLOR: Record<string, 'default' | 'info' | 'secondary'> = {
  request: 'default',
  response: 'info',
  webhook: 'secondary',
};

/**
 * One raw PSP body, collapsed to its headline and opened on demand.
 *
 * The summary line carries everything needed to decide whether to open it —
 * direction, event type, HTTP status, signature check and time — because a
 * payment retried by a provider for a day can accrue hundreds of these, and
 * the one that matters is usually found by its status code, not its contents.
 */
export default function PayloadAccordion({ log }: Props) {
  const httpColor =
    log.http_status == null
      ? 'default'
      : log.http_status >= 500
        ? 'error'
        : log.http_status >= 400
          ? 'warning'
          : 'success';

  return (
    <Accordion disableGutters variant="outlined" sx={{ '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ minWidth: 0, pr: 1 }}
        >
          <Chip
            size="small"
            label={log.direction}
            color={DIRECTION_COLOR[log.direction] ?? 'default'}
            variant="outlined"
          />
          <Typography variant="body2" fontWeight={600}>
            {log.event_type ?? 'untyped'}
          </Typography>
          {log.http_status != null && (
            <Chip size="small" label={`HTTP ${log.http_status}`} color={httpColor} />
          )}
          {log.signature_valid != null &&
            (log.signature_valid ? (
              <Tooltip title="Signature verified">
                <VerifiedUserIcon sx={{ fontSize: 16, color: 'success.main' }} />
              </Tooltip>
            ) : (
              <Tooltip title="Signature failed verification">
                <GppBadIcon sx={{ fontSize: 16, color: 'error.main' }} />
              </Tooltip>
            ))}
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(log.received_at)}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <JsonBlock value={log.payload} label="Payload" />
      </AccordionDetails>
    </Accordion>
  );
}
