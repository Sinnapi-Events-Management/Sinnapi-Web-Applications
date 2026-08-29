'use client';
import { useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { ExportFormat } from './types';

export type ExportMenuProps = {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  /** Button text. Ignored when `iconOnly`. */
  label?: string;
  /**
   * Renders the trigger as a bare icon button. Card headers use this — a
   * labelled button in every card header competes with the card's own title.
   */
  iconOnly?: boolean;
};

/**
 * Export dropdown offering Excel and PDF.
 *
 * Purely presentational: the parent supplies `onExport`, which decides *what*
 * gets serialised, so one menu drives both per-card and whole-page exports.
 */
export function ExportMenu({
  onExport,
  disabled,
  size = 'small',
  label = 'Export',
  iconOnly,
}: ExportMenuProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const close = () => setAnchor(null);

  const pick = (format: ExportFormat) => {
    onExport(format);
    close();
  };

  return (
    <>
      {iconOnly ? (
        <Tooltip title={label}>
          {/* span keeps the tooltip alive while the button is disabled */}
          <span>
            <IconButton
              size={size}
              onClick={(e) => setAnchor(e.currentTarget)}
              disabled={disabled}
              aria-label={label}
            >
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          size={size}
          variant="outlined"
          color="inherit"
          startIcon={<FileDownloadIcon />}
          onClick={(e) => setAnchor(e.currentTarget)}
          disabled={disabled}
          sx={{ textTransform: 'none', flexShrink: 0 }}
        >
          {label}
        </Button>
      )}

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

export default ExportMenu;
