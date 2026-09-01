import { Chip, Tooltip } from '@sinnapi/ui';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import type { ReviewVisibility } from '../../schema';

const NOTES: Partial<Record<ReviewVisibility, { label: string; note: string }>> = {
  pending: {
    label: 'In moderation',
    note: 'Not on your public profile yet, and not counted in your score, while our team checks it.',
  },
  hidden: {
    label: 'Hidden',
    note: 'Withheld from your public profile, so it is not counted in your score.',
  },
  removed: {
    label: 'Removed',
    note: 'Taken down and not counted in your score. Kept here so your review count is explainable.',
  },
};

/**
 * Marks a review that clients cannot see.
 *
 * Renders nothing for a published review — the normal case needs no badge, and
 * labelling every card "Published" would bury the three that are not.
 *
 * The reason lives in a tooltip rather than on the card. A vendor who spots the
 * chip wants to know why their count and their average disagree, and that is
 * one sentence they need once, not a paragraph on every card forever.
 */
export default function ReviewVisibilityChip({ visibility }: { visibility: ReviewVisibility }) {
  const note = NOTES[visibility];
  if (!note) return null;

  return (
    <Tooltip title={note.note}>
      <Chip
        size="small"
        variant="outlined"
        icon={<VisibilityOffOutlinedIcon />}
        label={note.label}
        sx={{ fontWeight: 600, color: 'text.secondary' }}
      />
    </Tooltip>
  );
}
