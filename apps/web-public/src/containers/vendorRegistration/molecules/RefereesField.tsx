import { Box, Grid, TextField, Button, IconButton, Typography, Paper } from '@sinnapi/ui/atoms';
import { DateField } from '@sinnapi/ui/molecules';
import { Add, DeleteOutline } from '@mui/icons-material';
import type { RegistrationApi } from '../hooks/useVendorRegistration';

type Props = { api: RegistrationApi };

/** Optional, repeatable client references. Add/remove rows; all fields optional. */
export default function RefereesField({ api }: Props) {
  const { values, submitting, addReferee, updateReferee, removeReferee } = api;

  return (
    <Box>
      {values.referees.map((r, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Reference {i + 1}
            </Typography>
            <IconButton
              size="small"
              aria-label={`Remove reference ${i + 1}`}
              disabled={submitting}
              onClick={() => removeReferee(i)}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Full name"
                fullWidth
                size="small"
                disabled={submitting}
                value={r.fullName ?? ''}
                onChange={(e) => updateReferee(i, { fullName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                fullWidth
                size="small"
                disabled={submitting}
                value={r.phone ?? ''}
                onChange={(e) => updateReferee(i, { phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                size="small"
                disabled={submitting}
                value={r.email ?? ''}
                onChange={(e) => updateReferee(i, { email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {/* A reference is work already delivered, so this date is always
                  in the past — the calendar says so rather than leaving the
                  applicant to discover it. */}
              <DateField
                label="Event date"
                size="small"
                disabled={submitting}
                disableFuture
                value={r.eventDate ?? ''}
                onChange={(next) => updateReferee(i, { eventDate: next })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Event worked on"
                fullWidth
                size="small"
                disabled={submitting}
                value={r.eventWorkedOn ?? ''}
                onChange={(e) => updateReferee(i, { eventWorkedOn: e.target.value })}
              />
            </Grid>
          </Grid>
        </Paper>
      ))}

      <Button
        variant="outlined"
        size="small"
        startIcon={<Add />}
        disabled={submitting}
        onClick={addReferee}
      >
        Add a reference
      </Button>
    </Box>
  );
}
