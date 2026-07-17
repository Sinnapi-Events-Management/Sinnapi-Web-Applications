import { CircularProgress, IconButton, Stack, Tooltip } from '@sinnapi/ui';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';

/** A vendor engagement counts as "approved" once shortlisted (interest) or the
 *  quote is accepted, and "rejected" once declined — actions disable to match. */
const APPROVED = new Set(['shortlisted', 'accepted']);
const REJECTED = new Set(['declined', 'withdrawn']);

type Props = {
  vendorName: string | null;
  status: string;
  onApprove: () => void;
  onReject: () => void;
  onMessage: () => void;
  /** Present only for quotation rows. */
  onDownload?: () => void;
  downloading?: boolean;
};

/**
 * Inline row actions for a vendor engaged with an event: message, approve,
 * reject, and (quotations only) download. Signals intent only — confirmation,
 * the write and the chat drawer are owned by the page/tab.
 */
export default function VendorRowActions({
  vendorName,
  status,
  onApprove,
  onReject,
  onMessage,
  onDownload,
  downloading,
}: Props) {
  const label = vendorName ?? 'vendor';

  return (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      <Tooltip title="Message vendor">
        <IconButton size="small" onClick={onMessage} aria-label={`Message ${label}`}>
          <ChatOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {onDownload && (
        <Tooltip title="Download quotation (PDF)">
          <span>
            <IconButton
              size="small"
              onClick={onDownload}
              disabled={downloading}
              aria-label={`Download quotation for ${label}`}
            >
              {downloading ? (
                <CircularProgress size={16} />
              ) : (
                <DownloadOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Tooltip title={APPROVED.has(status) ? 'Already approved' : 'Approve vendor'}>
        <span>
          <IconButton
            size="small"
            color="success"
            onClick={onApprove}
            disabled={APPROVED.has(status)}
            aria-label={`Approve ${label}`}
          >
            <CheckCircleOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={REJECTED.has(status) ? 'Already rejected' : 'Reject vendor'}>
        <span>
          <IconButton
            size="small"
            color="error"
            onClick={onReject}
            disabled={REJECTED.has(status)}
            aria-label={`Reject ${label}`}
          >
            <BlockIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
