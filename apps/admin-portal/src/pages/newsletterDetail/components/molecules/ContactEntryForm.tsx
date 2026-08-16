import { Box, Button, Stack, TextField, Typography } from '@sinnapi/ui';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import type { NewsletterContact } from '@/lib/types';

type Props = {
  draft: NewsletterContact;
  error: string | null;
  disabled?: boolean;
  onField: (field: keyof NewsletterContact, value: string) => void;
  onAdd: () => void;
};

/**
 * One person, one row: a name and an address, added together.
 *
 * Both fields are required, and the form is the reason the requirement is not
 * annoying — Enter moves from name to address to Add without touching the
 * mouse, so a handful of people is still a handful of keystrokes. Anything
 * longer than that belongs in the importer.
 */
export default function ContactEntryForm({ draft, error, disabled, onField, onAdd }: Props) {
  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    onAdd();
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
        <TextField
          size="small"
          label="Full name"
          placeholder="Ada Lovelace"
          value={draft.full_name}
          disabled={disabled}
          onChange={(e) => onField('full_name', e.target.value)}
          onKeyDown={submitOnEnter}
          sx={{ flex: 1, minWidth: 0 }}
          fullWidth
        />
        <TextField
          size="small"
          label="Email address"
          placeholder="ada@example.com"
          value={draft.email}
          disabled={disabled}
          onChange={(e) => onField('email', e.target.value)}
          onKeyDown={submitOnEnter}
          sx={{ flex: 1, minWidth: 0 }}
          fullWidth
        />
        <Button
          variant="outlined"
          startIcon={<PersonAddAlt1Icon />}
          disabled={disabled}
          onClick={onAdd}
          sx={{ mt: { xs: 0, sm: 0.25 }, flexShrink: 0 }}
        >
          Add
        </Button>
      </Stack>

      {/* One message under the whole row rather than per field: the rules are
          about the pair (both halves present, address valid, not already on the
          list), and splitting them across two helper texts makes "already
          added" have to pick a field it does not belong to. */}
      <Typography
        variant="caption"
        color={error ? 'error.main' : 'text.secondary'}
        sx={{ display: 'block', mt: 0.75, minHeight: 20, px: 0.5 }}
      >
        {error ??
          'Both are required — the name is stored with the send record and with any address book you save.'}
      </Typography>
    </Box>
  );
}
