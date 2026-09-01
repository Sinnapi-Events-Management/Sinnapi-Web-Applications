import { Avatar, Box, Button, Chip, Stack, Typography } from '@sinnapi/ui';
import type { QuoteComparisonModel } from '@/lib/types';

type Props = {
  quote: QuoteComparisonModel;
  canAccept: boolean;
  onAccept: (quotationId: string) => void;
};

/**
 * Who a comparison column belongs to, and the way to take it.
 *
 * The accept button lives in the header rather than in a final row, so it is
 * reachable without scrolling to the bottom of the attributes — a client who
 * has decided by the second row should not have to read the rest to act.
 *
 * The budget line is named on every column. Comparing quotes across two
 * different lines is usually a mistake and occasionally deliberate, and this is
 * what lets the client tell which they are doing.
 */
export default function CompareColumnHeader({ quote, canAccept, onAccept }: Props) {
  return (
    <Stack spacing={1} sx={{ pb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Avatar src={quote.primary_image_url ?? undefined} sx={{ width: 32, height: 32 }}>
          {quote.business_name.charAt(0)}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {quote.business_name}
          </Typography>
          {quote.requirement_title && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {quote.requirement_title}
            </Typography>
          )}
        </Box>
      </Stack>

      {quote.is_expired && <Chip size="small" variant="outlined" label="Expired" />}

      {canAccept ? (
        <Button size="small" variant="contained" onClick={() => onAccept(quote.quotation_id)}>
          Accept this
        </Button>
      ) : (
        // Says why rather than showing a disabled button with no explanation —
        // an expired quote and an already-accepted one are both un-acceptable
        // for reasons the client can act on.
        <Typography variant="caption" color="text.secondary">
          {quote.is_expired ? 'Ask them to re-quote' : `Cannot be accepted (${quote.status})`}
        </Typography>
      )}
    </Stack>
  );
}
