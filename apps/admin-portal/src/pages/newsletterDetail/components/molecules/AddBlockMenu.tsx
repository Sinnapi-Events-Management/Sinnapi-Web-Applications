import { useState } from 'react';
import { Button, Menu, MenuItem, ListItemText, Typography } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import { BLOCK_META, BLOCK_ORDER, type BlockType } from '../../schema';

type Props = { disabled?: boolean; onAdd: (type: BlockType) => void };

/**
 * The palette of block types.
 *
 * A menu rather than a row of buttons: ten block types as a toolbar either
 * wraps onto three lines or shrinks to unlabelled icons, and an icon-only
 * palette is unusable for anyone who has not already learned it. Each entry
 * carries its one-line hint so the choice can be made from the menu itself.
 */
export default function AddBlockMenu({ disabled, onAdd }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        disabled={disabled}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        Add block
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {BLOCK_ORDER.map((type) => (
          <MenuItem
            key={type}
            onClick={() => {
              onAdd(type);
              setAnchor(null);
            }}
          >
            <ListItemText
              primary={BLOCK_META[type].label}
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {BLOCK_META[type].hint}
                </Typography>
              }
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
