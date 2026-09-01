import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  Avatar,
  Chip,
  Divider,
  Button,
  Rating,
  StatusChip,
  HeroSurface,
  heroGhostSx,
  heroChipSx,
  heroDividerSx,
  heroAvatarSx,
  heroWarningSx,
} from '@sinnapi/ui';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import EmailIcon from '@mui/icons-material/Email';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { VendorStatus } from '@/hooks/useVendorStatus';
import { formatDate } from '@/lib/config';
import type { NamedRef, OwnerRef, VendorDetailModel } from '@/lib/types';
import VendorMetaItem from '../atoms/VendorMetaItem';

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
    <HeroSurface>
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
          sx={{ px: 3, ...heroGhostSx }}
        >
          Back to vendors
        </Button>
        {/* Suspending is the consequential move, so it reads as a muted amber
            ghost; activating is the hero's one affirmative action and takes the
            single gold fill. */}
        <Button
          size="small"
          variant={isActive ? 'text' : 'contained'}
          onClick={() => onRequestStatusChange(isActive ? 'suspended' : 'active')}
          sx={isActive ? heroWarningSx : { px: 3 }}
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
            ...heroAvatarSx,
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
              <Chip size="small" icon={<StarIcon />} label="Featured" sx={heroChipSx} />
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

      <Divider sx={{ my: 2.5, ...heroDividerSx }} />

      <Stack direction="row" flexWrap="wrap" useFlexGap gap={{ xs: 1.5, sm: 3 }}>
        {meta.map((m) => (
          <VendorMetaItem key={m.text} icon={m.icon} text={m.text} />
        ))}
      </Stack>
    </HeroSurface>
  );
}
