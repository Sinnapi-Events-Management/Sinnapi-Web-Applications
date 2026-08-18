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
import SearchIcon from '@mui/icons-material/Search';
import { useEngagedVendors } from '@/hooks/queries';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (vendorId: string) => void;
  busy?: boolean;
  error?: string | null;
};

/**
 * Picks which vendor to start a conversation with.
 *
 * Scoped to vendors the client already has a booking or quotation with, rather
 * than the whole marketplace. Searching every vendor in order to message one is
 * Discover's job and Discover does it properly — with filters, regions and
 * availability — whereas this list answers the question people actually arrive
 * with, which is "reach the florist I'm already booked with". The empty state
 * hands them to Discover rather than pretending this is the wrong door.
 */
export default function VendorPickerDialog({ open, onClose, onPick, busy, error }: Props) {
  const { data, isLoading, error: loadError } = useEngagedVendors();
  const [query, setQuery] = useState('');

  const vendors = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = data ?? [];
    return q ? all.filter((v) => v.business_name.toLowerCase().includes(q)) : all;
  }, [data, query]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Message a vendor</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <QueryState isLoading={isLoading} error={loadError}>
            {(data ?? []).length === 0 ? (
              <Stack spacing={2} alignItems="center" sx={{ py: 3, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  You have not booked or requested a quote from anyone yet. Find a vendor first and
                  you can message them from their profile.
                </Typography>
                <Button component={RouterLink} to="/discover" variant="contained" color="secondary">
                  Discover vendors
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
                    placeholder="Search your vendors…"
                    ariaLabel="Search your vendors"
                  />
                )}

                <List disablePadding sx={{ maxHeight: 360, overflowY: 'auto' }}>
                  {vendors.map((v) => (
                    <ListItemButton key={v.id} onClick={() => onPick(v.id)} disabled={busy}>
                      <ListItemAvatar>
                        <Avatar src={v.profile_image_url ?? undefined}>
                          {v.business_name.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={v.business_name} />
                    </ListItemButton>
                  ))}
                  {vendors.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No vendors match “{query}”.
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
