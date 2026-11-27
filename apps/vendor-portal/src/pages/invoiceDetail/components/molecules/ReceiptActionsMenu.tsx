import { useState, type MouseEvent } from 'react';
import {
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import SendIcon from '@mui/icons-material/SendOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import OpenIcon from '@mui/icons-material/OpenInNew';

type Props = {
  documentNo: string;
  isVoid: boolean;
  busy: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onEmailClient: () => void;
  onEmailSelf: () => void;
  onOpen: () => void;
};

/**
 * Everything a vendor can do with one receipt, from the invoice page. A
 * single "more" button keeps each row one line on a phone; the menu items
 * carry icons AND words. A void receipt can still be previewed and
 * downloaded, but not emailed.
 */
export default function ReceiptActionsMenu(p: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <>
      <Tooltip title="Receipt actions">
        <span>
          <IconButton
            aria-label={`Actions for receipt ${p.documentNo}`}
            aria-haspopup="menu"
            aria-expanded={anchor ? 'true' : undefined}
            onClick={(e: MouseEvent<HTMLElement>) => {
              e.stopPropagation();
              setAnchor(e.currentTarget);
            }}
            disabled={p.busy}
            size="small"
          >
            {p.busy ? <CircularProgress size={18} /> : <MoreVertIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={run(p.onPreview)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(p.onDownload)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        {!p.isVoid && (
          <MenuItem onClick={run(p.onEmailClient)}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Email to client</ListItemText>
          </MenuItem>
        )}
        {!p.isVoid && (
          <MenuItem onClick={run(p.onEmailSelf)}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Email to myself" secondary="Your client gets nothing" />
          </MenuItem>
        )}
        <MenuItem onClick={run(p.onOpen)}>
          <ListItemIcon>
            <OpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open receipt</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
