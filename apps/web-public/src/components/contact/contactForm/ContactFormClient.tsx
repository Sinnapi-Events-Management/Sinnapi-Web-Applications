'use client';
import { Stack, Button } from '@sinnapi/ui';
import { useContactForm } from './hooks/useContactForm';
import ContactFields from './components/ContactFields';
import ContactSuccess from './components/ContactSuccess';

export default function ContactFormClient() {
  const { errors, submitted, handleSubmit } = useContactForm();

  if (submitted) {
    return <ContactSuccess />;
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
      <ContactFields errors={errors} />
      <Button type="submit" variant="contained" size="large">
        Send message
      </Button>
    </Stack>
  );
}
