import { Box, Button, Chip, Stack, Tooltip, Typography } from '@sinnapi/ui';
import type { NewsletterContact } from '@/lib/types';

type Props = {
  contacts: NewsletterContact[];
  disabled?: boolean;
  emptyHint: string;
  onRemove: (email: string) => void;
  onClear?: () => void;
};

/** Beyond this the wall of chips stops being readable and starts being noise. */
const VISIBLE = 40;

/**
 * The people added so far, as removable chips.
 *
 * The chip shows the NAME and the address underneath it in the tooltip, not the
 * other way round: the operator is checking "did I get everyone from the
 * meeting", and they remember Aisha, not aisha.k@company.co.ug. The address is
 * one hover away for the moment they need to check a typo.
 */
export default function ContactChipList({
  contacts,
  disabled,
  emptyHint,
  onRemove,
  onClear,
}: Props) {
  if (contacts.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        {emptyHint}
      </Typography>
    );
  }

  const shown = contacts.slice(0, VISIBLE);
  const hidden = contacts.length - shown.length;

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary">
          {contacts.length.toLocaleString()} {contacts.length === 1 ? 'person' : 'people'} added
        </Typography>
        {onClear && (
          <Button size="small" color="inherit" variant="text" disabled={disabled} onClick={onClear}>
            Remove all
          </Button>
        )}
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {shown.map((contact) => (
          <Tooltip key={contact.email} title={contact.email}>
            <Chip
              size="small"
              label={contact.full_name}
              disabled={disabled}
              onDelete={disabled ? undefined : () => onRemove(contact.email)}
            />
          </Tooltip>
        ))}
        {hidden > 0 && (
          <Chip size="small" variant="outlined" label={`+${hidden.toLocaleString()} more`} />
        )}
      </Box>
    </Stack>
  );
}
