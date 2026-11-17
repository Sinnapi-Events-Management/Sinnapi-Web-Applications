import { useState, type ReactNode } from 'react';
import {
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
} from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export type DocAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  /** Red, for cancelling a document. */
  danger?: boolean;
  /** Small line under a menu item — e.g. why it is unavailable. */
  hint?: string | null;
};

type Props = {
  /** The one thing to do next — full width on a phone. */
  primary: DocAction | null;
  /** At most two everyday actions, shown as outlined buttons. */
  secondary?: DocAction[];
  /** Everything else, behind "⋮ More". */
  more?: DocAction[];
};

/**
 * The action area on an invoice or receipt page: one main button, a couple of
 * everyday ones beside it, and the rest in a "More" menu. It replaces a stack
 * of six equal buttons that gave a vendor no idea which one mattered.
 */
export default function DocumentActionBar({ primary, secondary = [], more = [] }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = (a: DocAction) => (a.busy ? (a.busyLabel ?? 'Please wait…') : a.label);

  return (
    <Stack spacing={1}>
      {primary && (
        <Button
          variant="contained"
          color="secondary"
          size="large"
          startIcon={primary.busy ? <CircularProgress size={16} color="inherit" /> : primary.icon}
          onClick={primary.onClick}
          disabled={primary.disabled || primary.busy}
          sx={{ minHeight: 48 }}
        >
          {label(primary)}
        </Button>
      )}
      <Stack direction="row" spacing={1}>
        {secondary.map((a) => (
          <Button
            key={a.label}
            variant="outlined"
            startIcon={a.busy ? <CircularProgress size={16} /> : a.icon}
            onClick={a.onClick}
            disabled={a.disabled || a.busy}
            sx={{
              minHeight: 44,
              flex: 1,
              px: 1,
              whiteSpace: 'nowrap',
              fontSize: { xs: '0.9rem', sm: undefined },
              // Icons dropped on a phone so two labels fit side by side on
              // one line each — they wrapped to three lines with them.
              '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
            }}
          >
            {label(a)}
          </Button>
        ))}
        {more.length > 0 && (
          <IconButton
            aria-label="More actions"
            aria-haspopup="menu"
            onClick={(e) => setAnchor(e.currentTarget)}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 2, width: 48, height: 44 }}
          >
            <MoreVertIcon />
          </IconButton>
        )}
      </Stack>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {more.map((a) => (
          <MenuItem
            key={a.label}
            disabled={a.disabled || a.busy}
            onClick={() => {
              setAnchor(null);
              a.onClick();
            }}
            sx={{ minHeight: 48, color: a.danger ? 'error.main' : undefined }}
          >
            {a.icon && (
              <ListItemIcon sx={{ color: a.danger ? 'error.main' : undefined }}>
                {a.icon}
              </ListItemIcon>
            )}
            <ListItemText
              primary={label(a)}
              secondary={a.hint ?? undefined}
              secondaryTypographyProps={{ sx: { whiteSpace: 'normal', maxWidth: 260 } }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Stack>
  );
}
