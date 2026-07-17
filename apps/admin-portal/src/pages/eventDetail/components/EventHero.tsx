import { Link as RouterLink } from 'react-router-dom';
import { Box, Stack, Typography, Chip, Divider, Button, alpha } from '@sinnapi/ui';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import StatusChip from '@/components/ui/StatusChip';
import type { EventStatus } from '@/lib/status';
import { formatDate, titleize } from '@/lib/config';
import type { EventDetailModel } from '@/lib/types';
import { getStatusTransitions } from '../../events/schema';

type Props = {
  event: EventDetailModel;
  onEdit: () => void;
  /** Signals intent only — the page owns confirmation and the write. */
  onRequestStatusChange: (status: EventStatus) => void;
  onRequestDelete: () => void;
};

/** Gradient header: title, lifecycle chips, quick-glance meta and primary actions. */
export default function EventHero({
  event: e,
  onEdit,
  onRequestStatusChange,
  onRequestDelete,
}: Props) {
  const meta = [
    e.event_type && { icon: <CategoryIcon />, text: titleize(e.event_type) },
    { icon: <CalendarMonthIcon />, text: e.event_date ? formatDate(e.event_date) : 'No date set' },
    e.location && { icon: <PlaceIcon />, text: e.location },
    e.is_public
      ? { icon: <PublicIcon />, text: 'Public' }
      : { icon: <LockIcon />, text: 'Not public' },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  const transitions = getStatusTransitions(e.status);

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
          `linear-gradient(120deg, ${t.palette.secondary.dark} 0%, ${t.palette.secondary.main} 52%, ${t.palette.primary.dark} 128%)`,
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
        flexWrap="wrap"
        useFlexGap
        gap={1}
        sx={{ position: 'relative', mb: 2 }}
      >
        <Button
          component={RouterLink}
          to="/events"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{
            color: 'common.white',
            bgcolor: alpha('#fff', 0.12),
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          }}
        >
          Back to events
        </Button>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {transitions.map((t) => (
            <Button
              key={t.to}
              size="small"
              variant="contained"
              color={
                t.tone === 'success' ? 'success' : t.tone === 'warning' ? 'warning' : 'inherit'
              }
              onClick={() => onRequestStatusChange(t.to)}
            >
              {t.label}
            </Button>
          ))}
          <Button
            size="small"
            variant="contained"
            color="inherit"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRequestDelete}
            sx={{
              color: 'common.white',
              borderColor: alpha('#fff', 0.5),
              '&:hover': { borderColor: 'common.white', bgcolor: alpha('#fff', 0.12) },
            }}
          >
            Delete
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ position: 'relative' }}
      >
        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15, mr: 0.5 }}>
          {e.title}
        </Typography>
        <StatusChip status={e.status} size="medium" />
        <Chip
          size="small"
          label={titleize(e.source)}
          sx={{ color: 'common.white', bgcolor: alpha('#fff', 0.16) }}
        />
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
