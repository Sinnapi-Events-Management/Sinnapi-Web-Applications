import { Box, Button, FormControlLabel, IconButton, Stack, Switch, TextField } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ListBlock } from '../../../schema';
import type { BlockEditorProps } from './types';

/** Short lines with bullets or numbers. */
export default function ListBlockEditor({
  block,
  disabled,
  onChange,
}: BlockEditorProps<ListBlock>) {
  const setItem = (index: number, value: string) =>
    onChange({ items: block.items.map((item, i) => (i === index ? value : item)) });

  const removeItem = (index: number) =>
    // Never empties completely: a list block with no rows offers no way to add
    // one back, so the last row is emptied rather than removed.
    onChange({
      items: block.items.length > 1 ? block.items.filter((_, i) => i !== index) : [''],
    });

  return (
    <Stack spacing={1.5}>
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(block.ordered)}
            disabled={disabled}
            onChange={(e) => onChange({ ordered: e.target.checked })}
          />
        }
        label="Numbered"
      />
      {block.items.map((item, index) => (
        <Stack key={index} direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            size="small"
            value={item}
            disabled={disabled}
            placeholder={`Item ${index + 1}`}
            onChange={(e) => setItem(index, e.target.value)}
          />
          <IconButton
            size="small"
            disabled={disabled}
            onClick={() => removeItem(index)}
            aria-label={`Remove item ${index + 1}`}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      <Box>
        <Button
          size="small"
          variant="text"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() => onChange({ items: [...block.items, ''] })}
        >
          Add item
        </Button>
      </Box>
    </Stack>
  );
}
