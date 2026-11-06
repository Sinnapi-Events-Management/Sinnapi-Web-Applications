import { Box, Stack, Typography } from '@sinnapi/ui';
import { DocumentStatusChip } from '@sinnapi/ui/documents';
import type { ReceiptItem } from '../../hooks/useInvoiceReceiptList';
import ReceiptActionsMenu from './ReceiptActionsMenu';

type Props = {
  item: ReceiptItem;
  busy: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onEmailClient: () => void;
  onEmailSelf: () => void;
  onOpen: () => void;
};

/**
 * One instalment: the amount first (what the vendor scans for), then its
 * number, date and method, and the balance it left. A void receipt stays
 * visible — struck through, muted — because it is part of the history.
 */
export default function ReceiptListItem({ item, busy, ...actions }: Props) {
  return (
    <Box
      component="li"
      sx={{
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1.25,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        opacity: item.isVoid ? 0.65 : 1,
      }}
    >
      <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              fontVariantNumeric: 'tabular-nums',
              textDecoration: item.isVoid ? 'line-through' : 'none',
            }}
          >
            {item.amount}
          </Typography>
          <DocumentStatusChip kind="receipt" status={item.status} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {item.documentNo} · {item.meta}
        </Typography>
        {item.after && (
          <Typography
            variant="caption"
            color={item.afterOverpaid ? 'warning.main' : 'text.secondary'}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {item.after}
          </Typography>
        )}
      </Stack>
      <ReceiptActionsMenu
        documentNo={item.documentNo}
        isVoid={item.isVoid}
        busy={busy}
        {...actions}
      />
    </Box>
  );
}
