import { Box, Stack, Typography, Chip, Button, IconButton, Tooltip } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeIcon from '@mui/icons-material/Badge';
import IconBadge from '@/components/ui/IconBadge';
import type { RoleModel } from '@/lib/types';
import GrantMeter from './GrantMeter';

type Props = {
  role: RoleModel;
  granted: number;
  total: number;
  locked: boolean;
  /** Disables the copy action while another write is running. */
  busy: boolean;
  onCopy: () => void;
  onClose: () => void;
};

/**
 * Identity block for the open role: name, key, its badges, the overall grant
 * meter and the copy action.
 *
 * The copy button is hidden rather than disabled on a locked role — a control
 * that can never fire is noise, and the locked banner below already explains
 * why editing is unavailable.
 */
export default function RolePaneHeader({
  role,
  granted,
  total,
  locked,
  busy,
  onCopy,
  onClose,
}: Props) {
  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <IconBadge accent={locked ? 'secondary' : 'primary'} size={48} iconSize={24}>
          {locked ? <LockOutlinedIcon /> : <BadgeIcon />}
        </IconBadge>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ lineHeight: 1.3, wordBreak: 'break-word' }}>
            {role.name}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {role.key}
            </Typography>
            {locked && (
              <Chip
                size="small"
                label="Read-only"
                color="secondary"
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {!locked && (
            <Tooltip title="Replace this role's permissions with another role's">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={onCopy}
                  disabled={busy}
                >
                  Copy from…
                </Button>
              </span>
            </Tooltip>
          )}
          <IconButton onClick={onClose} aria-label="Close role" size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ mt: 2 }}>
        <GrantMeter granted={granted} total={total} accent={locked ? 'secondary' : 'primary'} />
      </Box>
    </Box>
  );
}
