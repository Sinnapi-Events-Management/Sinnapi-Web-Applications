import { useState, type KeyboardEvent } from 'react';
import { Box, Button, Chip, Stack, TextField, Typography } from '@sinnapi/ui';
import AddIcon from '@mui/icons-material/Add';

type Props = {
  label: string;
  hint: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
};

/**
 * A short list of plain statements — what a package covers, or pointedly does
 * not.
 *
 * A chip list rather than a textarea. The two lists are rendered as separate
 * bullets on the public card, so collecting them as free prose would mean
 * splitting on newlines at save time and hoping the vendor used them. Entering
 * one at a time also makes the boundary explicit while it is being written,
 * which is the point of asking for exclusions at all.
 *
 * Enter commits the draft, because a list of five is five interactions and a
 * button press between each is four too many.
 */
export default function PackageScopeFields({ label, hint, placeholder, items, onChange }: Props) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim();
    // Silently ignoring a duplicate beats an error message about one: the
    // vendor's intent is already satisfied by the chip that is on screen.
    if (!value || items.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...items, value]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    // Inside a <form>, Enter would submit the whole package.
    event.preventDefault();
    commit();
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="flex-start">
        <TextField
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          size="small"
          fullWidth
          inputProps={{ maxLength: 160, 'aria-label': label }}
        />
        <Button onClick={commit} startIcon={<AddIcon />} disabled={!draft.trim()}>
          Add
        </Button>
      </Stack>

      {items.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
          {items.map((item, index) => (
            <Chip
              key={`${item}-${index}`}
              label={item}
              onDelete={() => onChange(items.filter((_, i) => i !== index))}
              size="small"
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
