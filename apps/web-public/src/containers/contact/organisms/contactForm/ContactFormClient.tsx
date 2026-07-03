'use client';
import { Stack, Button, CircularProgress } from '@sinnapi/ui/atoms';
import { Alert } from '@sinnapi/ui/molecules';
import { useContactForm } from './hooks/useContactForm';
import ContactFields from './molecules/ContactFields';
import ContactSuccess from './molecules/ContactSuccess';

export default function ContactFormClient() {
  const { errors, submitted, submitting, submitFailed, handleSubmit } = useContactForm();

  if (submitted) {
    return <ContactSuccess />;
  }

  return (
    <Stack component="form" spacing={3} onSubmit={handleSubmit} noValidate>
      {submitFailed && (
        <Alert severity="error">
          Something went wrong sending your message. Please try again or email us directly.
        </Alert>
      )}
      <ContactFields errors={errors} disabled={submitting} />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={submitting}
        startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ alignSelf: { sm: 'flex-start' } }}
      >
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
    </Stack>
  );
}
