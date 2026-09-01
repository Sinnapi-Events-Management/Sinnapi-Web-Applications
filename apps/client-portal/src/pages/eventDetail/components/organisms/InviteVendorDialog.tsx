import { useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  SearchField,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { EventRequirementModel, EventVendorModel } from '@/lib/types';
import { useInviteVendor } from '../../hooks/useInviteVendor';

type Props = {
  eventId: string;
  open: boolean;
  onClose: () => void;
  requirements: EventRequirementModel[];
  engaged: EventVendorModel[];
};

/**
 * Asking a vendor to quote for this event.
 *
 * STAYS OPEN AFTER AN INVITATION. A client sourcing a wedding invites four
 * caterers in one sitting, and a dialog that closed on the first would make
 * them reopen it, retype the search and re-pick the line three more times. Each
 * row flips to "Invited" in place instead.
 *
 * The brief is optional and says what happens if it is left blank: the RPC
 * falls back to the line's own brief, then the event description, so most
 * clients never need to type anything here. Making it required would ask them
 * to restate what they have already written twice.
 *
 * A vendor who does not list the chosen line's category is marked, and the
 * Invite button still works. `invite_vendor_to_event` deliberately does not
 * enforce what the vendor's own side now does: a client approaching someone
 * directly may know they do the work off-catalogue. The mark catches the
 * misclick — picking "Bridal makeup" and then inviting the photographer whose
 * name was already in the search box — without taking the decision away.
 */
export default function InviteVendorDialog({
  eventId,
  open,
  onClose,
  requirements,
  engaged,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const invite = useInviteVendor(eventId, engaged, requirements);
  const { reset } = invite;

  // Cleared on open rather than on close, so the list of who was just invited
  // stays readable through the closing transition.
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const liveRequirements = requirements.filter((r) => !r.cancelled_at);
  const mismatched = invite.mismatchedIds;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ pb: 1 }}>
        Invite a vendor to quote
        <Typography variant="body2" color="text.secondary">
          They will get a quote request with your brief and can reply with a price.
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {invite.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {invite.error}
          </Alert>
        )}

        <Stack spacing={2}>
          {liveRequirements.length > 0 && (
            <TextField
              select
              fullWidth
              label="Which part of the event?"
              value={invite.requirementId}
              onChange={(e) => invite.setRequirementId(e.target.value)}
              helperText={
                invite.requirement
                  ? `We will flag vendors who do not list ${invite.requirement.category_name}. You can still invite them.`
                  : 'Optional, but it lets us track the quote against that budget line.'
              }
            >
              <MenuItem value="">Not a specific line</MenuItem>
              {liveRequirements.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.title ?? r.category_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Anything to add? (optional)"
            value={invite.details}
            onChange={(e) => invite.setDetails(e.target.value)}
            helperText="Leave blank and we will send the brief from that line, or your event description."
          />

          <SearchField
            value={invite.query}
            onChange={invite.setQuery}
            placeholder="Search vendors by name"
            fullWidth
          />

          <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
            {invite.searching && invite.vendors.length === 0 ? (
              <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : invite.vendors.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                No vendors match that name.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {invite.vendors.map((v) => {
                  const alreadyHere = invite.engagedIds.has(v.id);
                  const justInvited = invite.invitedIds.includes(v.id);
                  const done = alreadyHere || justInvited;

                  return (
                    <Stack
                      key={v.id}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        py: 1,
                        px: 1,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Avatar
                        src={v.primary_image_url ?? v.profile_image_url ?? undefined}
                        sx={{ width: 36, height: 36 }}
                      >
                        {v.business_name.charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {v.business_name}
                        </Typography>
                        {/* The mismatch outranks the city: one is a fact about
                            the vendor, the other is a reason to look twice
                            before pressing Invite. */}
                        {mismatched.has(v.id) ? (
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <WarningAmberIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                            <Typography variant="caption" color="warning.main" noWrap>
                              Does not list {invite.requirement?.category_name}
                            </Typography>
                          </Stack>
                        ) : (
                          v.base_city && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {v.base_city}
                            </Typography>
                          )
                        )}
                      </Box>
                      <Button
                        size="small"
                        variant={done ? 'text' : 'outlined'}
                        disabled={done || invite.busyId === v.id}
                        onClick={() => invite.send(v.id)}
                        startIcon={
                          invite.busyId === v.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : done ? (
                            <CheckIcon />
                          ) : undefined
                        }
                        sx={{ flexShrink: 0 }}
                      >
                        {justInvited ? 'Invited' : alreadyHere ? 'Already here' : 'Invite'}
                      </Button>
                    </Stack>
                  );
                })}
              </Stack>
            )}

            {invite.isTruncated && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                More vendors match than are shown — narrow your search to see them.
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
