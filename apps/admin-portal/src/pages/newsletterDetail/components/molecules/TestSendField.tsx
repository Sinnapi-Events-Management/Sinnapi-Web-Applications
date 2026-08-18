import { useState } from 'react';
import { Button, Stack, TextField } from '@sinnapi/ui';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

type Props = { defaultEmail?: string; busy?: boolean; onSend: (email: string) => void };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Send one copy to a real inbox.
 *
 * Pre-filled with the signed-in admin's own address, because that is who sends
 * a test 95% of the time and typing your own email into a box you opened is
 * pure friction. The test goes through the same render and the same provider as
 * the real send — a preview shows you the markup, this shows you what Gmail
 * and Outlook actually do with it, which is not always the same thing.
 */
export default function TestSendField({ defaultEmail, busy, onSend }: Props) {
  const [email, setEmail] = useState(defaultEmail ?? '');
  const valid = EMAIL_RE.test(email.trim());

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
      <TextField
        size="small"
        label="Send a test to"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={Boolean(email) && !valid}
        helperText={email && !valid ? 'Enter a valid email address.' : ' '}
        sx={{ flex: 1, minWidth: { sm: 260 } }}
      />
      <Button
        variant="outlined"
        startIcon={<SendOutlinedIcon />}
        disabled={!valid || busy}
        onClick={() => onSend(email.trim())}
        sx={{ mt: { sm: 0.25 } }}
      >
        {busy ? 'Sending…' : 'Send test'}
      </Button>
    </Stack>
  );
}
