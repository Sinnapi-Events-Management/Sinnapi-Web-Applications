import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Avatar, Chip, Divider, Button, alpha } from '@sinnapi/ui';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockResetIcon from '@mui/icons-material/LockReset';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { UserModel } from '@/lib/types';

function initials(name: string | null): string {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

type Props = {
  client: UserModel;
  onRequestStatusChange: (status: 'active' | 'suspended') => void;
  onResetPassword: () => void;
  onRequestDelete: () => void;
};

/** Profile-style header: avatar, name, status, quick-glance meta and actions. */
export default function ClientHero({
  client: c,
  onRequestStatusChange,
  onResetPassword,
  onRequestDelete,
}: Props) {
  const roles = (c.user_roles ?? []).map((ur) => one(ur.roles)?.name).filter(Boolean) as string[];

  const meta = [
    c.email && { icon: <EmailIcon />, text: c.email },
    c.phone && { icon: <PhoneIcon />, text: c.phone },
    { icon: <CalendarMonthIcon />, text: `Joined ${formatDate(c.created_at)}` },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  const isActive = c.status === 'active';

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        p: { xs: 2.5, sm: 4 },
        mb: 3,
        color: 'common.white',
        background: (t) =>
          `linear-gradient(120deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 60%, ${t.palette.secondary.dark} 130%)`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: '50%',
          bgcolor: alpha('#fff', 0.12),
          filter: 'blur(4px)',
        }}
      />

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ position: 'relative', mb: 2 }}
      >
        <Button
          component={RouterLink}
          to="/clients"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{
            color: 'common.white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
        >
          Back to clients
        </Button>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            startIcon={<LockResetIcon />}
            onClick={onResetPassword}
            sx={{
              color: 'common.white',
              bgcolor: alpha('#fff', 0.12),
              '&:hover': { bgcolor: alpha('#fff', 0.22) },
            }}
          >
            Reset password
          </Button>
          <Button
            size="small"
            variant="contained"
            color={isActive ? 'error' : 'success'}
            onClick={() => onRequestStatusChange(isActive ? 'suspended' : 'active')}
          >
            {isActive ? 'Block client' : 'Activate client'}
          </Button>
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRequestDelete}
            sx={{
              color: 'common.white',
              bgcolor: alpha('#fff', 0.12),
              '&:hover': { bgcolor: alpha('#ff5252', 0.4) },
            }}
          >
            Remove
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ position: 'relative' }}
      >
        <Avatar
          sx={{
            width: { xs: 56, sm: 72 },
            height: { xs: 56, sm: 72 },
            fontSize: { xs: 22, sm: 28 },
            fontWeight: 700,
            bgcolor: alpha('#fff', 0.22),
            color: 'common.white',
            border: '2px solid',
            borderColor: alpha('#fff', 0.4),
          }}
        >
          {initials(c.full_name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              {c.full_name ?? '—'}
            </Typography>
            <StatusChip status={c.status} size="medium" />
            {roles.map((r) => (
              <Chip
                key={r}
                size="small"
                label={r}
                sx={{ color: 'common.white', bgcolor: alpha('#fff', 0.16) }}
              />
            ))}
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5, borderColor: alpha('#fff', 0.2) }} />

      <Stack direction="row" flexWrap="wrap" useFlexGap gap={{ xs: 1.5, sm: 3 }}>
        {meta.map((m, i) => (
          <Stack key={i} direction="row" spacing={0.75} alignItems="center" sx={{ opacity: 0.92 }}>
            <Box sx={{ display: 'flex', '& svg': { fontSize: 18 } }}>{m.icon}</Box>
            <Typography variant="body2" noWrap>
              {m.text}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
