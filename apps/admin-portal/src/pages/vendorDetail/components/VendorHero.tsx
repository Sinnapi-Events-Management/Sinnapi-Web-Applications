import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Avatar, Chip, Divider, Button, Rating, alpha } from '@sinnapi/ui';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import EmailIcon from '@mui/icons-material/Email';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StatusChip from '@/components/ui/StatusChip';
import type { VendorStatus } from '@/hooks/useVendorStatus';
import { formatDate } from '@/lib/config';
import type { NamedRef, OwnerRef, VendorDetailModel } from '@/lib/types';

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
  vendor: VendorDetailModel;
  owner: OwnerRef | null;
  category: NamedRef | null;
  /** Signals intent only — the page owns confirmation and the write. */
  onRequestStatusChange: (status: VendorStatus) => void;
};

/** Profile-style header: avatar, business name, status and quick-glance meta. */
export default function VendorHero({ vendor: v, owner, category, onRequestStatusChange }: Props) {
  const meta = [
    category?.name && { icon: <CategoryIcon />, text: category.name },
    v.base_city && { icon: <PlaceIcon />, text: v.base_city },
    owner?.email && { icon: <EmailIcon />, text: owner.email },
    owner?.phone && { icon: <PhoneIcon />, text: owner.phone },
    { icon: <CalendarMonthIcon />, text: `Joined ${formatDate(v.created_at)}` },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  const isActive = v.status === 'active';

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
          `linear-gradient(120deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 55%, ${t.palette.secondary.main} 130%)`,
      }}
    >
      {/* decorative glow */}
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
        spacing={1}
        sx={{ position: 'relative', mb: 2 }}
      >
        <Button
          component={RouterLink}
          to="/vendors"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{
            color: 'common.white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
        >
          Back to vendors
        </Button>
        <Button
          size="small"
          variant="contained"
          color={isActive ? 'error' : 'success'}
          onClick={() => onRequestStatusChange(isActive ? 'suspended' : 'active')}
        >
          {isActive ? 'Suspend vendor' : 'Activate vendor'}
        </Button>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ position: 'relative' }}
      >
        <Avatar
          src={v.profile_image_url ?? undefined}
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
          {initials(v.business_name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
              {v.business_name ?? '—'}
            </Typography>
            <StatusChip status={v.status} size="medium" />
            <StatusChip status={v.visibility} size="medium" />
            {v.is_featured && (
              <Chip
                size="small"
                icon={<StarIcon />}
                label="Featured"
                sx={{
                  color: 'common.white',
                  bgcolor: alpha('#fff', 0.16),
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, opacity: 0.95 }}>
            <Rating value={v.avg_rating ?? 0} size="small" readOnly precision={0.5} />
            <Typography variant="body2">
              {(v.avg_rating ?? 0).toFixed(1)} · {v.review_count ?? 0} reviews
            </Typography>
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
