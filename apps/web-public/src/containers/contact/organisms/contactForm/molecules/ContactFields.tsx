import { TextField } from '@sinnapi/ui';

interface ContactFieldsProps {
  errors: Record<string, string>;
}

export default function ContactFields({ errors }: ContactFieldsProps) {
  return (
    <>
      <TextField
        name="name"
        label="Your name"
        error={!!errors.name}
        helperText={errors.name}
        required
      />
      <TextField
        name="email"
        type="email"
        label="Email"
        error={!!errors.email}
        helperText={errors.email}
        required
      />
      <TextField
        name="message"
        label="Message"
        multiline
        minRows={4}
        error={!!errors.message}
        helperText={errors.message}
        required
      />
    </>
  );
}
