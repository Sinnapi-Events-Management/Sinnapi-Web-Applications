import { Box, MenuItem, Stack, TextField, Typography } from '@sinnapi/ui';
import type { ContactListModel } from '@/lib/types';

type Props = {
  lists: ContactListModel[];
  loading?: boolean;
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (list: ContactListModel | null) => void;
};

const NONE = '';

/**
 * Choose a saved address book by title.
 *
 * The row shows the title, the contact count and the description, because a
 * title alone stops being enough at about six books — "Vendors 2026" and
 * "Vendor expo 2026" are indistinguishable until you read what they are, and
 * the cost of picking wrong is mailing the wrong people. The description was
 * asked for at save time precisely so it could be shown here.
 */
export default function ContactListSelectField({
  lists,
  loading,
  selectedId,
  disabled,
  onSelect,
}: Props) {
  return (
    <TextField
      select
      size="small"
      label="Saved address book"
      value={selectedId ?? NONE}
      disabled={disabled || loading}
      onChange={(e) => onSelect(lists.find((l) => l.id === e.target.value) ?? null)}
      helperText={
        loading
          ? 'Loading your address books…'
          : lists.length
            ? 'Pick a book, then choose who in it receives this campaign.'
            : 'No address books yet — save a list of contacts and it will appear here.'
      }
      fullWidth
      SelectProps={{
        // Without this the collapsed field renders the whole two-line row,
        // including the description, inside a one-line input.
        renderValue: (value) => lists.find((l) => l.id === value)?.title ?? 'None',
      }}
    >
      <MenuItem value={NONE}>None</MenuItem>
      {lists.map((list) => (
        <MenuItem key={list.id} value={list.id}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="baseline">
              <Typography variant="body2" fontWeight={600}>
                {list.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {list.contact_count.toLocaleString()} contacts
              </Typography>
            </Stack>
            {list.description && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', whiteSpace: 'normal' }}
              >
                {list.description}
              </Typography>
            )}
          </Box>
        </MenuItem>
      ))}
    </TextField>
  );
}
