import { Avatar, Box, Chip, Stack, Typography } from '@sinnapi/ui';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import type { AuditLogModel } from '@/lib/types';
import { actorInfo, initials } from '../../schema/presenter';

/**
 * Who performed the action: an avatar with the person's name and their role(s)
 * as chips. Automated (system) actions render a distinct settings badge instead
 * of an opaque UUID.
 */
export default function ActorCell({ log }: { log: AuditLogModel }) {
  const { isSystem, name, email, roles } = actorInfo(log);

  if (isSystem) {
    return (
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover', color: 'text.secondary' }}>
          <SettingsSuggestOutlinedIcon sx={{ fontSize: 18 }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            System
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Automated action
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 600 }}>
        {initials(name)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {name}
        </Typography>
        {roles.length > 0 ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
            {roles.map((role) => (
              <Chip
                key={role.id}
                size="small"
                label={role.name}
                variant="outlined"
                color={role.is_admin ? 'primary' : 'default'}
                sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary" noWrap>
            {email ?? 'No role assigned'}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
