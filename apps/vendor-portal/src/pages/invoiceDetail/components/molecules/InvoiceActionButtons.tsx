import { Box, Button, CircularProgress } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/SendOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import CopyIcon from '@mui/icons-material/ContentCopyOutlined';
import type { InvoiceDetailApi } from '../../hooks/useInvoiceDetail';

/**
 * The invoice's next steps, most likely first. "Record payment" leads while
 * money is still owed; once settled the email action leads instead.
 * One column in the sidebar, two side by side on a phone where the card
 * spans the screen.
 */
export default function InvoiceActionButtons({ d }: { d: InvoiceDetailApi }) {
  const owed = d.coverage?.state === 'unpaid' || d.coverage?.state === 'short';
  const paymentLeads = d.canRecordPayment && owed;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr' },
        '& > .lead': { gridColumn: '1 / -1' },
      }}
    >
      {d.canRecordPayment && (
        <Button
          className={paymentLeads ? 'lead' : undefined}
          variant={paymentLeads ? 'contained' : 'outlined'}
          startIcon={<AddIcon />}
          onClick={d.openPayment}
        >
          {d.recordPaymentLabel}
        </Button>
      )}
      {d.canSend && (
        <Button
          className={paymentLeads ? undefined : 'lead'}
          variant={paymentLeads ? 'outlined' : 'contained'}
          startIcon={<SendIcon />}
          onClick={d.emailInvoice}
        >
          Email to client
        </Button>
      )}
      {d.canSend && (
        <Button
          variant="outlined"
          startIcon={d.emailingSelf ? <CircularProgress size={16} /> : <PersonIcon />}
          onClick={d.emailInvoiceToSelf}
          disabled={d.emailingSelf}
        >
          {d.emailingSelf ? 'Sending…' : 'Email to myself'}
        </Button>
      )}
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={d.download}
        disabled={d.downloading}
      >
        {d.downloading ? 'Preparing PDF…' : 'Download PDF'}
      </Button>
      {d.canDuplicate && (
        <Button
          variant="text"
          color="inherit"
          startIcon={<CopyIcon />}
          onClick={d.copyToDraft}
          disabled={d.copying}
        >
          {d.copying ? 'Copying…' : 'Copy into a new draft'}
        </Button>
      )}
    </Box>
  );
}
