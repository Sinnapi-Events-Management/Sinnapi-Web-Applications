import { Typography, List, ListItem, ListItemText, IconButton, Chip } from '@sinnapi/ui';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatDate } from '@/lib/config';
import type { BlockedDateModel } from '@/lib/types';

type Props = {
  rows: BlockedDateModel[];
  onUnblock: (id: string) => void;
};

/**
 * The dates the vendor is unavailable. Only manual blocks are removable —
 * booking-derived ones clear when the booking does.
 */
export default function BlockedDateList({ rows, onUnblock }: Props) {
  if (rows.length === 0)
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No blocked dates.
      </Typography>
    );

  return (
    <List>
      {rows.map((b) => (
        <ListItem
          key={b.id}
          secondaryAction={
            b.source === 'manual' ? (
              <IconButton edge="end" aria-label="Remove" onClick={() => onUnblock(b.id)}>
                <DeleteIcon />
              </IconButton>
            ) : (
              <Chip size="small" label="Booking" />
            )
          }
        >
          <ListItemText primary={formatDate(b.blocked_date)} secondary={b.reason ?? undefined} />
        </ListItem>
      ))}
    </List>
  );
}
