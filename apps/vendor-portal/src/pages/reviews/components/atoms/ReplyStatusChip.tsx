import { Chip } from '@sinnapi/ui';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';

/**
 * Whether a review has been answered, said once so every card says it the same
 * way.
 *
 * An unanswered review is `warning` rather than `error`: it is work outstanding,
 * not a fault, and a wall of red on the day a vendor's first reviews land would
 * read as something having gone wrong. Answered is outlined rather than filled —
 * the state that needs no action should not be the louder of the two.
 */
export default function ReplyStatusChip({ replied }: { replied: boolean }) {
  return replied ? (
    <Chip
      size="small"
      variant="outlined"
      color="success"
      icon={<CheckCircleOutlineIcon />}
      label="Replied"
      sx={{ fontWeight: 600 }}
    />
  ) : (
    <Chip
      size="small"
      color="warning"
      icon={<ForumOutlinedIcon />}
      label="Awaiting reply"
      sx={{ fontWeight: 600 }}
    />
  );
}
