// Send one email or throw — for callers that retry on failure (the outbox, a
// webhook that answers 5xx so its provider redelivers).
//
// Prefers the shared SMTP transport so the message gets the standard Sinnapi
// shell with the inline (CID) brand logo, falling back to the HTTP provider
// for environments that only have EMAIL_API_KEY. The HTTP path cannot carry an
// inline attachment, so the logo degrades to its alt text there.
import { sendEmail, type EmailMessage } from './email.ts';

export async function deliverEmail(msg: EmailMessage): Promise<void> {
  const result = await sendEmail(msg);
  if (result.sent) return;

  const key = Deno.env.get('EMAIL_API_KEY');
  // Throwing is what makes the caller retry. Returning quietly would mark the
  // work done with nothing delivered.
  if (!key) throw new Error(`email_not_sent: ${result.error ?? 'unknown'}`);
  const res = await fetch(Deno.env.get('EMAIL_API_URL') ?? 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM'),
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      // Carried through deliberately: the support-desk copies rely on Reply-To
      // to let an operator answer the person who wrote in. Dropping it on the
      // HTTP path would make that work over SMTP and silently not over Resend.
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`email_provider_${res.status}`);
}
