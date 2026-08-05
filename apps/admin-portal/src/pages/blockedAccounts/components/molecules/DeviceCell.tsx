import { Stack, Tooltip, Typography } from '@sinnapi/ui';
import ComputerIcon from '@mui/icons-material/Computer';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DeviceUnknownIcon from '@mui/icons-material/DeviceUnknown';
import type { SvgIconComponent } from '@mui/icons-material';
import { deviceInfo } from '../../schema/presenter';
import type { BlockedAccountModel } from '@/lib/types';
import type { ParsedUserAgent } from '@/lib/userAgent';

const ICONS: Record<ParsedUserAgent['device'], SvgIconComponent> = {
  desktop: ComputerIcon,
  mobile: SmartphoneIcon,
  tablet: TabletMacIcon,
  bot: SmartToyIcon,
  unknown: DeviceUnknownIcon,
};

/**
 * Browser and OS behind the most recent attempt.
 *
 * The raw user-agent is kept in the tooltip rather than shown: it is
 * unreadable at a glance but is the only thing that settles an argument about
 * what the parse got wrong, so discarding it from the UI entirely would make
 * the parsed summary unfalsifiable.
 *
 * A `bot` classification is worth its own icon — an obviously automated agent
 * against a locked account is the clearest signal on this page.
 */
export default function DeviceCell({ row }: { row: BlockedAccountModel }) {
  const info = deviceInfo(row);
  const Icon = ICONS[info.device];

  if (!info.summary) {
    return (
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Tooltip title={row.last_user_agent ?? ''} placement="top">
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
        <Icon
          fontSize="small"
          color={info.device === 'bot' ? 'error' : 'action'}
          titleAccess={info.device}
        />
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap>
            {info.browser ?? 'Unknown browser'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {info.os ?? 'Unknown OS'}
          </Typography>
        </Stack>
      </Stack>
    </Tooltip>
  );
}
