import { Alert, Box, Button, DialogContent, DialogActions, Stack, Typography } from '@sinnapi/ui';
import { ControlledField } from '@sinnapi/ui/forms';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { useQuoteRequestForm, type QuoteRequestPackage } from '../../hooks/useQuoteRequestForm';

type Props = {
  vendorId: string;
  onCancel: () => void;
  onSuccess: () => void;
  /**
   * Set when the request was started from a published package rather than from
   * the sidebar button. It travels to the server so the vendor's builder can
   * open on the tier the client picked.
   */
  pkg?: QuoteRequestPackage;
};

/**
 * The brief a client sends when asking a vendor to quote.
 *
 * The offer, when there is one, is confirmed at the TOP rather than left to be
 * inferred from a pre-filled code field. A client who clicked "Request this
 * package and save UGX 360,000" is mid-way through claiming a saving, and the
 * next screen has to acknowledge it or the claim looks dropped.
 *
 * The code field stays editable underneath. A client who arrived from a flyer
 * rather than from a card needs somewhere to type, and a client whose code was
 * refused needs somewhere to clear it — which is why a code error lands on the
 * field and not on the form: the brief they have written must survive it.
 */
export default function QuoteRequestForm({ vendorId, onCancel, onSuccess, pkg }: Props) {
  const { control, error, codeError, busy, submit, offerLabel } = useQuoteRequestForm(
    vendorId,
    onSuccess,
    pkg,
  );

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {offerLabel && (
            <Alert severity="success" icon={<LocalOfferRoundedIcon fontSize="inherit" />}>
              {offerLabel} will be applied when this vendor prices your quote.
            </Alert>
          )}

          {/* Above the brief, because it is the one fact a vendor cannot price
              without and the one clients reliably bury in the prose below. */}
          <ControlledField
            name="eventAddress"
            control={control}
            label="Event address"
            placeholder="Venue or street address"
            helperText="Where the vendor should turn up. This carries over to your booking."
          />

          <ControlledField
            name="details"
            control={control}
            label="Describe your event & requirements"
            multiline
            minRows={4}
            autoFocus
          />

          <Box>
            <ControlledField
              name="discountCode"
              control={control}
              label="Discount code (optional)"
              placeholder="EARLY-BIRD"
              helperText="Have a code from this vendor? Add it and the saving is applied to your quote."
              inputProps={{
                autoCapitalize: 'characters',
                autoCorrect: 'off',
                spellCheck: false,
                // Presentational only — the server matches case-insensitively.
                style: { textTransform: 'uppercase', letterSpacing: '0.06em' },
              }}
            />
            {/* The server's refusal, under the field rather than through it.
                `ControlledField` derives its error state from react-hook-form,
                which knows nothing about a code the database rejected — and
                pushing this into the form's error state would mark the field
                invalid permanently, so a client who cleared the code could
                never submit. */}
            {codeError && (
              <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                {codeError} Clear the field to send your request without it.
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? 'Sending…' : 'Send request'}
        </Button>
      </DialogActions>
    </Box>
  );
}
