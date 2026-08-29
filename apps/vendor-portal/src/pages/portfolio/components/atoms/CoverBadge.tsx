import { Chip } from '@sinnapi/ui';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

/**
 * Marks the one item that leads the vendor's public profile.
 *
 * Fixed dark-on-gold rather than themed: it sits on a photograph, not on the
 * page, so it has to stay legible over whatever that photograph happens to be —
 * the same reasoning as the viewer's controls.
 */
export default function CoverBadge() {
  return (
    <Chip
      size="small"
      icon={<StarRoundedIcon sx={{ fontSize: 15 }} />}
      label="Cover"
      sx={{
        height: 24,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 0.2,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: 2,
        '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
      }}
    />
  );
}
