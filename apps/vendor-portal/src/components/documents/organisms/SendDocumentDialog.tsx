import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@sinnapi/ui';
import { useSendDocument, type SendMode, type SendTarget } from '../hooks/useSendDocument';

type Props = {
  open: boolean;
  target: SendTarget | null;
  documentNo: string;
  onClose: () => void;
  onSent: (recipient: string) => void;
};

function SendForm({
  target,
  documentNo,
  onClose,
  onSent,
}: Omit<Props, 'open'> & { target: SendTarget }) {
  const s = useSendDocument(target, onSent);
  const noun = target.kind === 'invoice' ? 'invoice' : 'receipt';

  return (
    <>
      <DialogContent>
        <Stack spacing={2.25}>
          <Typography variant="body2" color="text.secondary">
            {documentNo} goes as a PDF attachment, with a short email from your business.
          </Typography>

          <RadioGroup
            value={s.mode}
            onChange={(e) => s.setMode(e.target.value as SendMode)}
            aria-label="Who to send it to"
          >
            {target.hasClientAccount && (
              <FormControlLabel
                value="account"
                control={<Radio />}
                label="To their Sinnapi email — kept private, Sinnapi delivers it"
              />
            )}
            <FormControlLabel
              value="address"
              control={<Radio />}
              label={target.hasClientAccount ? 'To another email address' : 'To my client'}
            />
            <FormControlLabel
              value="self"
              control={<Radio />}
              label="Only to me — your client gets nothing"
            />
          </RadioGroup>

          {s.mode === 'address' && (
            <TextField
              label="Email address"
              type="email"
              value={s.address}
              onChange={(e) => s.setAddress(e.target.value)}
              error={s.address !== '' && !s.addressValid}
              helperText={
                s.address !== '' && !s.addressValid ? 'Enter a valid email address.' : ' '
              }
              fullWidth
              autoFocus
            />
          )}

          <TextField
            label={s.mode === 'self' ? 'Note to yourself (optional)' : 'Message (optional)'}
            value={s.message}
            onChange={(e) => s.setMessage(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            inputProps={{ maxLength: 2000 }}
            placeholder={`Hello, please find your ${noun} attached.`}
          />

          {s.mode !== 'self' && (
            <FormControlLabel
              control={
                <Checkbox checked={s.ccSelf} onChange={(e) => s.setCcSelf(e.target.checked)} />
              }
              label="Send me a copy"
            />
          )}

          {s.error && <Alert severity="error">{s.error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={s.busy} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={s.send} disabled={!s.canSend}>
          {s.busy ? 'Sending…' : `Send ${noun}`}
        </Button>
      </DialogActions>
    </>
  );
}

/** Email an issued invoice or receipt. Mounted only while open: each open has a fresh request key. */
export default function SendDocumentDialog({ open, target, documentNo, onClose, onSent }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Email {documentNo}</DialogTitle>
      {open && target && (
        <SendForm target={target} documentNo={documentNo} onClose={onClose} onSent={onSent} />
      )}
    </Dialog>
  );
}
