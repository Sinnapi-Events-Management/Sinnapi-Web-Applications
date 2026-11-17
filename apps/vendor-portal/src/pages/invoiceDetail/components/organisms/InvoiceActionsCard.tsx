import { Alert, Card, CardContent, Stack, Typography } from '@sinnapi/ui';
import { DocumentStatusChip, formatDocumentDate } from '@sinnapi/ui/documents';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/SendOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import CopyIcon from '@mui/icons-material/ContentCopyOutlined';
import BlockIcon from '@mui/icons-material/Block';
import DocumentActionBar, {
  type DocAction,
} from '@/components/documents/organisms/DocumentActionBar';
import { daysFromToday } from '@/lib/bookingCopy';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';
import InvoiceMoneySummary from '../molecules/InvoiceMoneySummary';

/** "Due today", "Due in 5 days", "3 days late". */
function dueText(due: string | null | undefined, owed: boolean): string | null {
  const n = daysFromToday(due);
  if (n === null || !owed) return due ? `Due ${formatDocumentDate(due)}` : null;
  if (n === 0) return 'Due today';
  if (n > 0) return `Due in ${n} day${n === 1 ? '' : 's'} (${formatDocumentDate(due)})`;
  return `${-n} day${n === -1 ? '' : 's'} late — was due ${formatDocumentDate(due)}`;
}

/**
 * Who the invoice is for, what is paid and owed, and one main thing to do:
 * record a payment while money is owed, otherwise send it to the client.
 * Everything else sits behind "More" (approved 2026-11-17) — this used to be
 * six stacked buttons of equal weight.
 */
export default function InvoiceActionsCard({ d }: { d: InvoiceDetailApi }) {
  const row = d.row!;
  const isVoid = row.status === 'void';
  const owed = d.coverage?.state === 'unpaid' || d.coverage?.state === 'short';
  const late = owed && (daysFromToday(row.due_date) ?? 0) < 0;

  const record: DocAction | null = d.canRecordPayment
    ? {
        label: owed ? 'Record a payment' : 'Record an extra payment',
        onClick: d.openPayment,
        icon: <AddIcon />,
      }
    : null;
  const send: DocAction | null = d.canSend
    ? { label: 'Send to client', onClick: d.emailInvoice, icon: <SendIcon /> }
    : null;
  const download: DocAction = {
    label: 'Download PDF',
    busyLabel: 'Preparing…',
    onClick: d.download,
    busy: d.downloading,
    icon: <DownloadIcon />,
  };

  const primary = isVoid ? null : owed && record ? record : (send ?? record);
  const secondary = [send && send !== primary ? send : null, download].filter(
    (a): a is DocAction => !!a,
  );
  const more: DocAction[] = [
    ...(record && record !== primary ? [record] : []),
    ...(d.canSend
      ? [
          {
            label: 'Email a copy to myself',
            busyLabel: 'Sending…',
            onClick: d.emailInvoiceToSelf,
            busy: d.emailingSelf,
            icon: <PersonIcon />,
          },
        ]
      : []),
    ...(d.canDuplicate
      ? [
          {
            label: 'Copy into a new invoice',
            busyLabel: 'Copying…',
            onClick: d.copyToDraft,
            busy: d.copying,
            icon: <CopyIcon />,
          },
        ]
      : []),
    ...(d.canVoid || d.voidBlockedReason
      ? [
          {
            label: 'Cancel this invoice',
            onClick: d.openVoid,
            disabled: !d.canVoid,
            hint: d.canVoid ? null : d.voidBlockedReason,
            danger: true,
            icon: <BlockIcon />,
          },
        ]
      : []),
  ];

  return (
    <Card variant="outlined" component="section" aria-label="Invoice summary" sx={{ mb: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1}
            >
              <Typography
                variant="h5"
                component="h2"
                fontWeight={700}
                sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}
              >
                {row.recipient_name}
              </Typography>
              {d.display && <DocumentStatusChip kind="invoice" status={d.display} />}
            </Stack>
            {row.title && (
              <Typography variant="body1" color="text.secondary">
                For {row.title}
              </Typography>
            )}
            {!isVoid && (
              <Typography
                variant="body2"
                fontWeight={late ? 700 : 400}
                color={late ? 'error.main' : 'text.secondary'}
              >
                {dueText(row.due_date, owed)}
              </Typography>
            )}
          </Stack>

          <InvoiceMoneySummary d={d} />

          {d.isBooking && !isVoid && (
            <Alert severity="info">
              {row.status === 'paid'
                ? 'Paid through Sinnapi.'
                : 'Your client pays this booking through Sinnapi. It is marked paid as soon as they do.'}
            </Alert>
          )}
          {isVoid && row.void_reason && (
            <Alert severity="warning">Cancelled: {row.void_reason}</Alert>
          )}
          {d.downloadError && <Alert severity="error">{d.downloadError}</Alert>}

          <DocumentActionBar primary={primary} secondary={secondary} more={more} />

          <Typography variant="caption" color="text.secondary">
            Invoice number {row.document_no}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
