// The support-desk copy of a reply someone sent to the Sinnapi WhatsApp number.
// Pure content: no I/O.
import {
  APP_NAME,
  emailDataTable,
  emailHeading,
  emailLayout,
  emailPanel,
  emailParagraph,
  emailText,
  escapeHtml,
  type EmailMessage,
} from '../_shared/emailTemplate.ts';

export interface ReplySender {
  fullName: string | null;
  email: string | null;
  reference: string | null;
  businessName: string | null;
}

/** Text shown for a message that carried no words (photo, voice note, …). */
export function describeNonText(type: string): string {
  const what: Record<string, string> = {
    image: 'a photo',
    video: 'a video',
    audio: 'a voice note or audio file',
    document: 'a document',
    sticker: 'a sticker',
    location: 'a location',
    contacts: 'a contact card',
    reaction: 'a reaction',
  };
  return `(They sent ${what[type] ?? `a "${type}" message`}. Media is not forwarded — contact them to ask what it was.)`;
}

export function whatsAppReplyEmail(
  to: string | string[],
  r: { phone: string; text: string; receivedAt: string; senders: ReplySender[] },
): EmailMessage {
  const first = r.senders[0];
  const who = first?.businessName ?? first?.fullName ?? r.phone;

  const rows = [
    { label: 'WhatsApp number', value: r.phone },
    { label: 'Received', value: r.receivedAt },
    ...(r.senders.length === 0
      ? [{ label: 'Account', value: 'No Sinnapi account has this number' }]
      : r.senders.flatMap((s, i) => {
          const n = r.senders.length > 1 ? ` ${i + 1}` : '';
          return [
            ...(s.fullName ? [{ label: `Name${n}`, value: s.fullName }] : []),
            ...(s.businessName ? [{ label: `Business${n}`, value: s.businessName }] : []),
            ...(s.email ? [{ label: `Email${n}`, value: s.email }] : []),
            ...(s.reference ? [{ label: `Reference${n}`, value: s.reference }] : []),
          ];
        })),
  ];

  // Reply-To only when exactly one person can be meant; with two accounts on
  // one phone, guessing which inbox to answer is worse than not offering one.
  const replyTo = r.senders.length === 1 && first?.email ? first.email : undefined;
  const note = replyTo
    ? 'Nobody reads the Sinnapi WhatsApp number. Replying to this email reaches their email address; you can also call or WhatsApp them from your own phone. They have been told to use Messages in the app.'
    : 'Nobody reads the Sinnapi WhatsApp number. Contact them by phone, or through their account in the admin portal. They have been told to use Messages in the app.';

  const messageHtml = escapeHtml(r.text.trim()).replace(/\r?\n/g, '<br />');

  return {
    to,
    subject: `WhatsApp reply from ${who}`,
    text: emailText([
      `${who} replied to a ${APP_NAME} WhatsApp notification.`,
      '',
      ...rows.map((row) => `  ${row.label}: ${row.value}`),
      '',
      'Message:',
      r.text.trim(),
      '',
      note,
    ]),
    html: emailLayout({
      heading: 'WhatsApp reply',
      preheader: `${who}: ${r.text.trim().slice(0, 90)}`,
      body: [
        emailParagraph(
          `<strong>${escapeHtml(who)}</strong> replied to a ${escapeHtml(APP_NAME)} WhatsApp notification.`,
        ),
        emailDataTable(rows),
        emailHeading('Message'),
        emailPanel({ tone: 'info', body: messageHtml }),
        emailParagraph(escapeHtml(note)),
      ].join('\n'),
    }),
    ...(replyTo ? { replyTo } : {}),
  };
}
