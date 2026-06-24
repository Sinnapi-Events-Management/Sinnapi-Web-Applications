import ContactFormClient from './ContactFormClient';

/**
 * Server Component shell. Keeps the contact form's entry point on the server
 * so only the interactive island (ContactFormClient) ships to the browser.
 */
export default function ContactForm() {
  return <ContactFormClient />;
}
