import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  DetailTabPanel,
  DetailTabs,
  Stack,
  Toast,
  Typography,
} from '@sinnapi/ui';
import { BackButton, EmptyState, useBreadcrumbTitle, useUrlTab } from '@sinnapi/ui/router';
import SendIcon from '@mui/icons-material/SendOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import BlockIcon from '@mui/icons-material/Block';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import DocumentActionBar, {
  type DocAction,
} from '@/components/documents/organisms/DocumentActionBar';
import {
  DocumentStatusChip,
  ReceiptPreview,
  documentErrorMessage,
  formatDocumentDate,
  formatDocumentMoney,
} from '@sinnapi/ui/documents';
import VendorGate from '@/vendor/VendorGate';
import VoidDialog from '@/components/documents/organisms/VoidDialog';
import DeliveryHistory from '@/components/documents/organisms/DeliveryHistory';
import SendDocumentDialog from '@/components/documents/organisms/SendDocumentDialog';
import { useReceiptDetail } from './hooks/useReceiptDetail';

const TABS = ['receipt', 'emails'] as const;

function Workspace({ receiptId }: { receiptId: string }) {
  const d = useReceiptDetail(receiptId);
  const { tab, setTab } = useUrlTab(TABS);
  useBreadcrumbTitle(d.row?.recipient_name ? `Receipt for ${d.row.recipient_name}` : undefined);

  if (d.isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (d.error)
    return (
      <Alert severity="error">
        {documentErrorMessage(d.error, 'This receipt could not be loaded.')}
      </Alert>
    );
  if (!d.row || !d.view) {
    return (
      <EmptyState
        title="Receipt not found"
        ctaLabel="Back to receipts"
        ctaHref="/invoices?tab=receipts"
      />
    );
  }
  const row = d.row;
  const issued = row.status === 'issued';
  const more: DocAction[] = [
    ...(issued
      ? [
          {
            label: 'Email a copy to myself',
            busyLabel: 'Sending…',
            onClick: d.emailSelf,
            busy: d.emailingSelf,
            icon: <PersonIcon />,
          },
          {
            label: 'Cancel this receipt',
            onClick: d.openVoid,
            danger: true,
            icon: <BlockIcon />,
          },
        ]
      : []),
  ];

  return (
    <>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={1}
              >
                <Typography variant="body1" color="text.secondary">
                  Payment received from
                </Typography>
                <DocumentStatusChip kind="receipt" status={row.status} />
              </Stack>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={700}
                sx={{ overflowWrap: 'anywhere' }}
              >
                {row.recipient_name}
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                sx={{ fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
              >
                {formatDocumentMoney(row.amount, row.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDocumentDate(row.payment_date)}
                {row.description ? ` · ${row.description}` : ''}
              </Typography>
            </Stack>
            {row.status === 'void' && row.void_reason && (
              <Alert severity="warning">Cancelled: {row.void_reason}</Alert>
            )}
            {d.downloadError && <Alert severity="error">{d.downloadError}</Alert>}
            <DocumentActionBar
              primary={
                issued ? { label: 'Send to client', onClick: d.openSend, icon: <SendIcon /> } : null
              }
              secondary={[
                {
                  label: 'Download PDF',
                  busyLabel: 'Preparing…',
                  onClick: d.download,
                  busy: d.downloading,
                  icon: <DownloadIcon />,
                },
              ]}
              more={more}
            />
            {row.invoice_id && (
              <Button
                component={RouterLink}
                to={`/invoices/${row.invoice_id}`}
                variant="text"
                sx={{ alignSelf: 'flex-start' }}
              >
                Open invoice {row.vendor_invoices?.document_no ?? ''}
              </Button>
            )}
            <Typography variant="caption" color="text.secondary">
              Receipt number {row.document_no}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <DetailTabs
        items={[
          {
            value: 'receipt',
            label: 'Receipt',
            icon: <ReceiptLongOutlinedIcon fontSize="small" />,
          },
          { value: 'emails', label: 'Emails', icon: <MailOutlineIcon fontSize="small" /> },
        ]}
        value={tab}
        onChange={setTab}
        idPrefix="receipt"
        ariaLabel="Receipt sections"
      />
      <DetailTabPanel value="receipt" active={tab} idPrefix="receipt">
        <ReceiptPreview receipt={d.view} />
      </DetailTabPanel>
      <DetailTabPanel value="emails" active={tab} idPrefix="receipt">
        <DeliveryHistory deliveries={d.deliveries} loading={d.deliveriesLoading} />
      </DetailTabPanel>

      <VoidDialog
        open={d.voidOpen}
        noun="receipt"
        documentNo={row.document_no}
        consequence={
          row.invoice_id
            ? 'The payment is taken off the invoice, which goes back to owing this amount. The receipt stays in your records, marked CANCELLED.'
            : 'The receipt stays in your records, marked CANCELLED.'
        }
        busy={d.voidBusy}
        error={d.voidError}
        onConfirm={d.confirmVoid}
        onClose={d.closeVoid}
      />
      <SendDocumentDialog
        open={d.sendOpen}
        target={d.sendTarget}
        documentNo={row.document_no}
        onClose={d.closeSend}
        onSent={d.sent}
      />
      <Toast toast={d.toast} onClose={d.dismissToast} />
    </>
  );
}

/** `/receipts/:id` — one payment receipt. */
export default function ReceiptDetail() {
  const { id = '' } = useParams<{ id: string }>();
  return (
    <>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/invoices?tab=receipts" />
      </Box>
      <VendorGate>{() => <Workspace receiptId={id} />}</VendorGate>
    </>
  );
}
