"use client";
import { useState } from "react";
import { Stack, TextField, Button, Alert } from "@mui/material";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});

export default function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: form.get("name"), email: form.get("email"), message: form.get("message"),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fieldErrors[i.path[0] as string] = i.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    // Lead capture would POST to a public Edge Function / contact endpoint.
    setSubmitted(true);
  }

  if (submitted) {
    return <Alert severity="success">Thanks for reaching out — we’ll get back to you shortly.</Alert>;
  }

  return (
    <Stack component="form" spacing={2.5} onSubmit={handleSubmit} noValidate>
      <TextField name="name" label="Your name" error={!!errors.name} helperText={errors.name} required />
      <TextField name="email" type="email" label="Email" error={!!errors.email} helperText={errors.email} required />
      <TextField name="message" label="Message" multiline minRows={4} error={!!errors.message} helperText={errors.message} required />
      <Button type="submit" variant="contained" size="large">Send message</Button>
    </Stack>
  );
}
