import { Button, CircularProgress, Stack, Typography } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import { Send } from '@mui/icons-material';

type Props = { submitting: boolean; canSubmit: boolean; errorMessage?: string };

/** Form footer: any submit failure, then the submit button (full width on phones). */
export default function SubmitBar({ submitting, canSubmit, errorMessage }: Props) {
  return (
    <Stack spacing={2} sx={{ mt: { xs: 3, md: 4 }, pt: 3, borderTop: 1, borderColor: 'divider' }}>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
      >
        <Typography variant="caption" color="text.secondary">
          Fields marked * are required.
        </Typography>
        <Button
          type="submit"
          variant="contained"
          size="large"
          endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Send />}
          disabled={!canSubmit}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {submitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </Stack>
    </Stack>
  );
}
