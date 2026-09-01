import { useState, type MouseEvent } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PromotionRow } from '../../schema';
import PromotionBanner from '../atoms/PromotionBanner';
import PromotionCoverage from './PromotionCoverage';
import PromotionStatusChip from '../atoms/PromotionStatusChip';
import PromotionWindow from './PromotionWindow';
import PromotionCodes from './PromotionCodes';

type Props = {
  promotion: PromotionRow;
  now: number;
  busy: boolean;
  codesLoading: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

/**
 * One campaign, read the way a vendor asks about it: what it looks like, what
 * it says, when it runs, and — last, beneath a rule — what it has returned.
 *
 * The result sits at the bottom rather than the top because it is a consequence
 * of the campaign rather than a property of it, and because putting the same
 * rule above it in every card is what keeps the redemption lines aligned across
 * a row whose descriptions are different lengths. `height: '100%'` with a flex
 * column and a spacer above the divider is what does that; without it the grid
 * reads as ragged and two campaigns look harder to compare than they are.
 *
 * Every action lives behind one overflow menu rather than as a row of buttons.
 * A campaign card already carries an image, a chip, a bar and two figures, and
 * four competing buttons under that is what turns a marketing surface into a
 * control panel. The menu's labels change with the state — a live campaign
 * offers Pause, a paused one offers Resume — so the card never shows a control
 * that would do nothing.
 */
export default function PromotionCard({
  promotion,
  now,
  busy,
  codesLoading,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const openMenu = (event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget);
  const closeMenu = () => setAnchor(null);
  const pick = (action: () => void) => () => {
    closeMenu();
    action();
  };

  const paused = promotion.status === 'paused';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        // Campaigns nobody can see stay legible, just visibly out of play — the
        // same treatment archived packages and hidden services get, so the
        // three screens agree on what "not live" looks like.
        opacity: paused || promotion.status === 'ended' ? 0.78 : 1,
        transition: (t) => t.transitions.create(['box-shadow', 'border-color']),
        '&:hover': { borderColor: 'text.disabled' },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <PromotionBanner url={promotion.banner_url} title={promotion.title} />
        {busy && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.35)',
            }}
          >
            <CircularProgress size={24} sx={{ color: 'common.white' }} />
          </Box>
        )}
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.25 }}>
              {promotion.title}
            </Typography>
            <Box sx={{ mt: 0.75 }}>
              <PromotionStatusChip status={promotion.status} />
            </Box>
          </Box>
          <IconButton
            aria-label={`Actions for ${promotion.title}`}
            onClick={openMenu}
            size="small"
            disabled={busy}
          >
            <MoreVertIcon />
          </IconButton>
        </Stack>

        {promotion.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              // Clamped rather than truncated at a character count: a card is a
              // summary, and letting one long campaign stretch its row is what
              // makes the grid impossible to scan.
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
            }}
          >
            {promotion.description}
          </Typography>
        )}

        <PromotionCoverage promotion={promotion} />

        <Box sx={{ flex: 1 }} />
        <Divider />

        <PromotionWindow promotion={promotion} now={now} />
        <PromotionCodes promotion={promotion} loading={codesLoading} />
      </CardContent>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        <MenuItem onClick={pick(onEdit)}>
          <EditOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={pick(onToggleActive)}>
          {paused ? (
            <PlayCircleOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
          ) : (
            <PauseCircleOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
          )}
          {paused ? 'Resume' : 'Pause'}
        </MenuItem>
        <MenuItem onClick={pick(onDuplicate)}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1.5 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={pick(onDelete)} sx={{ color: 'error.main' }}>
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
}
