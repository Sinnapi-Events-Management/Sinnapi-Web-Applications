import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  Chip,
  Divider,
  Button,
  StatusChip,
  HeroSurface,
  heroGhostSx,
  heroChipSx,
  heroDividerSx,
  heroQuietSx,
  heroWarningSx,
  heroDangerSx,
} from '@sinnapi/ui';
import type { SxProps } from '@sinnapi/ui';
import type { Theme } from '@sinnapi/ui/theme';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CategoryIcon from '@mui/icons-material/Category';
import type { EventStatus } from '@/lib/status';
import { formatDate, titleize } from '@/lib/config';
import type { EventDetailModel } from '@/lib/types';
import { getStatusTransitions, type EventTransition } from '../../events/schema';

type Props = {
  event: EventDetailModel;
  onEdit: () => void;
  /** Signals intent only — the page owns confirmation and the write. */
  onRequestStatusChange: (status: EventStatus) => void;
  onRequestDelete: () => void;
};

// A transition's accent tracks how consequential the move is, not whether it is
// "good" — a green Publish beside an amber Close just adds hues the status chip
// already communicates. Routine, reversible moves therefore stay neutral.
const TRANSITION_SX: Record<EventTransition['tone'], SxProps<Theme>> = {
  success: heroQuietSx,
  neutral: heroQuietSx,
  warning: heroWarningSx,
  danger: heroDangerSx,
};

/** Gradient header: title, lifecycle chips, quick-glance meta and primary actions. */
export default function EventHero({
  event: e,
  onEdit,
  onRequestStatusChange,
  onRequestDelete,
}: Props) {
  const meta = [
    // The managed type carries its own display name, so no titleizing a token.
    e.event_type?.name && { icon: <CategoryIcon />, text: e.event_type.name },
    { icon: <CalendarMonthIcon />, text: e.event_date ? formatDate(e.event_date) : 'No date set' },
    e.location && { icon: <PlaceIcon />, text: e.location },
    e.is_public
      ? { icon: <PublicIcon />, text: 'Public' }
      : { icon: <LockIcon />, text: 'Not public' },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  const transitions = getStatusTransitions(e.status);

  return (
    <HeroSurface>
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
          sx={{ px: 3, ...heroGhostSx }}
        >
          Back to events
        </Button>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {/* The row's single fill — gold via the theme's default button color. */}
          <Button
            size="small"
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={onEdit}
            sx={{ px: 3 }}
          >
            Edit
          </Button>
          {transitions.map((t) => (
            <Button
              key={t.to}
              size="small"
              onClick={() => onRequestStatusChange(t.to)}
              sx={TRANSITION_SX[t.tone]}
            >
              {t.label}
            </Button>
          ))}
          <Button
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={onRequestDelete}
            sx={heroDangerSx}
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
        <Chip size="small" label={titleize(e.source)} sx={heroChipSx} />
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
