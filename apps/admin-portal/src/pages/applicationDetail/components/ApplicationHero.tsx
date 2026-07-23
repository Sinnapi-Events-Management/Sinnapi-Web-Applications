import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Avatar, Chip, Divider, Button } from '@sinnapi/ui';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BadgeIcon from '@mui/icons-material/Badge';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HeroSurface from '@/components/ui/HeroSurface';
import {
  heroGhostSx,
  heroChipSx,
  heroDividerSx,
  heroAvatarSx,
} from '@/components/ui/heroSurface.styles';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, titleize } from '@/lib/config';
import type { IntakeDetailModel } from '@/lib/types';

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Profile-style header: avatar, business name, status and quick-glance meta. */
export default function ApplicationHero({ a }: { a: IntakeDetailModel }) {
  const meta = [
    a.owner_email && { icon: <EmailIcon />, text: a.owner_email },
    a.owner_phone && { icon: <PhoneIcon />, text: a.owner_phone },
    a.base_city && { icon: <PlaceIcon />, text: a.base_city },
    { icon: <CalendarMonthIcon />, text: `Submitted ${formatDate(a.created_at)}` },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <HeroSurface>
      <Button
        component={RouterLink}
        to="/applications"
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{ position: 'relative', mb: 2, px: 3, ...heroGhostSx }}
      >
        Back to applications
      </Button>
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
            ...heroAvatarSx,
          }}
        >
          {initials(a.business_name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              {a.business_name}
            </Typography>
            <StatusChip status={a.status} size="medium" />
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 1, opacity: 0.9 }}
          >
            {a.applicant_type && (
              <Chip
                size="small"
                icon={<BadgeIcon />}
                label={titleize(a.applicant_type)}
                sx={heroChipSx}
              />
            )}
            {a.submission_ref && (
              <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                {a.submission_ref}
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

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
    </HeroSurface>
  );
}
