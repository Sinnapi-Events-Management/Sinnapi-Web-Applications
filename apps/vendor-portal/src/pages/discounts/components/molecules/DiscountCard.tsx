import { useState, type MouseEvent } from 'react';
import {
  alpha,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@sinnapi/ui';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { DiscountRow } from '../../schema';
import DiscountStatusChip from '../atoms/DiscountStatusChip';
import DiscountValue from '../atoms/DiscountValue';
import DiscountCode from './DiscountCode';
import DiscountTerms from './DiscountTerms';
import DiscountUsage from './DiscountUsage';
import DiscountWindow from './DiscountWindow';

type Props = {
  discount: DiscountRow;
  now: number;
  busy: boolean;
  /** True while this card's code is the one just copied. */
  copied: boolean;
  onCopy: (code: string) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

/**
 * One discount code, read in the order a vendor asks about it: what to type,
 * what it takes off, what qualifies for it, and — last, beneath a rule — what
 * it has returned and how long it has left.
 *
 * The code leads because it is the only part of this card that leaves the
 * screen. Everything else is a setting the vendor already chose; the code is
 * the thing they came to copy into a caption, a broadcast or a printer's brief,
 * and burying it under a value they set last month is what made the old table
 * a lookup rather than a tool.
 *
 * The result sits at the bottom because it is a consequence of the code rather
 * than a property of it, and because putting the same rule above it in every
 * card is what keeps the redemption lines aligned across a row whose codes and
 * conditions are different lengths. `height: '100%'` with a flex column and a
 * spacer above the divider is what does that; without it the grid reads as
 * ragged and two offers look harder to compare than they are.
 *
 * Every action lives behind one overflow menu rather than a row of buttons. The
 * card already carries a copy button that must stay unmistakable, and four
 * competing controls beside it is what turns a marketing surface into a control
 * panel. The menu's labels change with the state — a live code offers Pause, a
 * paused one offers Resume — so the card never shows a control that would do
 * nothing.
 */
export default function DiscountCard({
  discount,
  now,
  busy,
  copied,
  onCopy,
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

  const paused = discount.status === 'paused';
  const label = discount.code ?? 'the automatic discount';

  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        // Codes nobody can redeem stay legible, just visibly out of play — the
        // same treatment paused campaigns and archived packages get, so the
        // three screens agree on what "not live" looks like.
        opacity: paused || discount.status === 'ended' ? 0.78 : 1,
        transition: (t) => t.transitions.create(['box-shadow', 'border-color']),
        '&:hover': { borderColor: 'text.disabled' },
      }}
    >
      {busy && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'grid',
            placeItems: 'center',
            // Tinted from the card's own surface rather than a black wash: this
            // card has no artwork behind it, and a dark scrim over the light
            // theme reads as a different component rather than a busy one.
            bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <DiscountCode code={discount.code} copied={copied} onCopy={onCopy} />
          </Box>
          <IconButton
            aria-label={`Actions for ${label}`}
            onClick={openMenu}
            size="small"
            disabled={busy}
            sx={{ flexShrink: 0 }}
          >
            <MoreVertIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <DiscountValue discount={discount} />
          <Box sx={{ flexShrink: 0 }}>
            <DiscountStatusChip status={discount.status} />
          </Box>
        </Stack>

        <DiscountTerms discount={discount} />

        <Box sx={{ flex: 1 }} />
        <Divider />

        <DiscountUsage discount={discount} />
        <DiscountWindow discount={discount} now={now} />
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
