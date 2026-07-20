import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@sinnapi/ui';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { ExportFormat } from '../../data/reportExport';

type Props = {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  /** Compact icon-only trigger for per-card actions; full button otherwise. */
  size?: 'small' | 'medium';
  label?: string;
};

/**
 * Export dropdown offering Excel and PDF. Purely presentational — the parent
 * supplies `onExport`, which decides *what* data gets serialised, so the same
 * menu drives per-card and whole-report exports.
 */
export default function ExportMenu({
  onExport,
  disabled,
  size = 'small',
  label = 'Export',
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  const pick = (format: ExportFormat) => {
    onExport(format);
    close();
  };

  return (
    <>
      <Button
        size={size}
        variant="outlined"
        color="inherit"
        startIcon={<FileDownloadIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        disabled={disabled}
        sx={{ textTransform: 'none' }}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <MenuItem onClick={() => pick('excel')}>
          <ListItemIcon>
            <GridOnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Excel (.xlsx)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => pick('pdf')}>
          <ListItemIcon>
            <PictureAsPdfIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>PDF (.pdf)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
