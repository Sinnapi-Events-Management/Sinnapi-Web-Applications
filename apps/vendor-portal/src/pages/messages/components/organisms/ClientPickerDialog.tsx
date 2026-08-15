import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Alert,
  SearchField,
  QueryState,
} from '@sinnapi/ui';
import GroupIcon from '@mui/icons-material/Group';
import { useVendorClients } from '@/hooks/queries';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (clientId: string) => void;
  busy?: boolean;
  error?: string | null;
};

/**
 * Picks which client to start a conversation with.
 *
 * The list comes from `get_vendor_clients()`, which applies exactly the same
 * booking-or-quotation test the send RPC enforces. Offering a name the send
 * would then refuse is a UI that lies, so the two share the predicate rather
 * than each having their own idea of who is reachable.
 */
export default function ClientPickerDialog({ open, onClose, onPick, busy, error }: Props) {
  const { data, isLoading, error: loadError } = useVendorClients();
  const [query, setQuery] = useState('');

  const clients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = data ?? [];
    return q ? all.filter((c) => c.display_name.toLowerCase().includes(q)) : all;
  }, [data, query]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Message a client</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <QueryState isLoading={isLoading} error={loadError}>
            {(data ?? []).length === 0 ? (
              <Stack spacing={2} alignItems="center" sx={{ py: 3, textAlign: 'center' }}>
                <GroupIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  You can message a client once they have requested a quote or made a booking with
                  you. Until then, they have to reach out first.
                </Typography>
                <Button component={RouterLink} to="/quotations" variant="outlined">
                  View quotation requests
                </Button>
              </Stack>
            ) : (
              <>
                {/* Only worth the row once the list is long enough to scan badly. */}
                {(data ?? []).length > 6 && (
                  <SearchField
                    value={query}
                    onChange={setQuery}
                    onClear={() => setQuery('')}
                    placeholder="Search your clients…"
                    ariaLabel="Search your clients"
                  />
                )}

                <List disablePadding sx={{ maxHeight: 360, overflowY: 'auto' }}>
                  {clients.map((c) => (
                    <ListItemButton
                      key={c.client_id}
                      onClick={() => onPick(c.client_id)}
                      disabled={busy}
                    >
                      <ListItemAvatar>
                        <Avatar src={c.avatar_url ?? undefined}>
                          {c.display_name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={c.display_name} />
                    </ListItemButton>
                  ))}
                  {clients.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No clients match “{query}”.
                    </Typography>
                  )}
                </List>
              </>
            )}
          </QueryState>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
