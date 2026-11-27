// deno test supabase/functions/whatsapp-webhook/parse.test.ts
import { assertEquals } from 'jsr:@std/assert@1';
import { parseWebhook, replyIntent, validSignature } from './parse.ts';

// The real callback from the first test send (2026-11-03), number anonymised:
// the API accepted the message, then Meta failed it because the account was locked.
const LOCKED = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: '301559946380662',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '15556125062', phone_number_id: '312053198661243' },
            contacts: [{ wa_id: '256700000001' }],
            statuses: [
              {
                id: 'wamid.TEST==',
                status: 'failed',
                timestamp: '1793693219',
                recipient_id: '256700000001',
                errors: [
                  {
                    code: 131031,
                    title: 'Business Account locked',
                    message: 'Business Account locked',
                    error_data: { details: 'Business account has been locked.' },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
};

Deno.test('parses a failed status with its error', () => {
  const { statuses, inbound } = parseWebhook(LOCKED);
  assertEquals(inbound, []);
  assertEquals(statuses, [
    {
      messageId: 'wamid.TEST==',
      status: 'failed',
      at: new Date(1793693219 * 1000).toISOString(),
      errorCode: '131031',
      errorMessage: 'Business Account locked — Business account has been locked.',
    },
  ]);
});

Deno.test('parses inbound text and button replies with a plus on the number', () => {
  const { inbound } = parseWebhook({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              messages: [
                { id: 'w1', from: '256700000001', type: 'text', text: { body: 'STOP' } },
                { id: 'w2', from: '256700000002', type: 'button', button: { text: 'Start' } },
                { id: 'w3', from: '256700000003', type: 'image', image: {} },
                { id: 'w4', from: 'not-a-number', type: 'text', text: { body: 'STOP' } },
                { from: '256700000005', type: 'text', text: { body: 'no id' } },
              ],
            },
          },
        ],
      },
    ],
  });
  assertEquals(inbound, [
    { id: 'w1', type: 'text', from: '+256700000001', text: 'STOP' },
    { id: 'w2', type: 'button', from: '+256700000002', text: 'Start' },
    { id: 'w3', type: 'image', from: '+256700000003', text: null },
  ]);
});

Deno.test('ignores anything that is not a WhatsApp messages event', () => {
  assertEquals(parseWebhook({ object: 'page', entry: [] }), { statuses: [], inbound: [] });
  assertEquals(parseWebhook(null), { statuses: [], inbound: [] });
});

Deno.test('STOP/START only when it is the whole message', () => {
  assertEquals(replyIntent('STOP'), 'stop');
  assertEquals(replyIntent(' stop. '), 'stop');
  assertEquals(replyIntent('Stop all'), 'stop');
  assertEquals(replyIntent('unsubscribe!'), 'stop');
  assertEquals(replyIntent('start'), 'start');
  assertEquals(replyIntent("please don't stop my booking"), null);
  assertEquals(replyIntent('Thanks'), null);
  assertEquals(replyIntent(null), null);
});

Deno.test('signature: accepts Meta HMAC, rejects tampering and missing secret', async () => {
  const body = JSON.stringify(LOCKED);
  const secret = 'test-app-secret';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  const header = `sha256=${Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('')}`;

  assertEquals(await validSignature(body, header, secret), true);
  assertEquals(await validSignature(body + ' ', header, secret), false);
  assertEquals(await validSignature(body, header, 'other-secret'), false);
  assertEquals(await validSignature(body, null, secret), false);
  assertEquals(await validSignature(body, header, ''), false);
});
