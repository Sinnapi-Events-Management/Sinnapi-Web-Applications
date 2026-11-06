// deno test supabase/functions/send-financial-document/lib.test.ts
//
// The pure half of send-financial-document. The network half (RLS read,
// storage download, the delivery RPCs, SMTP) is covered by the SQL test
// 1105_financial_documents.test.sql and by a run against a real project.
import { assert, assertEquals, assertThrows } from 'jsr:@std/assert@1';
import {
  attachmentName,
  formatDate,
  formatMoney,
  isPdf,
  maskEmail,
  parseSendRequest,
  rpcHttpError,
  sha256Hex,
  toBase64,
} from './lib.ts';
import { documentEmail } from './emails.ts';

const ID = '3f1c2b9e-8a7d-4c6b-9e5f-1a2b3c4d5e6f';
const KEY = '9b8a7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

Deno.test('parseSendRequest accepts a minimal invoice request', () => {
  const r = parseSendRequest({ kind: 'invoice', id: ID, requestKey: KEY });
  assertEquals(r, {
    kind: 'invoice',
    id: ID,
    to: null,
    ccSelf: false,
    message: null,
    requestKey: KEY,
  });
});

Deno.test('parseSendRequest normalises an address and keeps client_account', () => {
  assertEquals(
    parseSendRequest({ kind: 'receipt', id: ID, requestKey: KEY, to: ' Kato@Example.COM ' }).to,
    'kato@example.com',
  );
  assertEquals(
    parseSendRequest({ kind: 'receipt', id: ID, requestKey: KEY, to: 'client_account' }).to,
    'client_account',
  );
});

Deno.test('parseSendRequest refuses bad input', () => {
  assertThrows(() => parseSendRequest(null), Error, 'invalid_body');
  assertThrows(
    () => parseSendRequest({ kind: 'quote', id: ID, requestKey: KEY }),
    Error,
    'invalid_kind',
  );
  assertThrows(
    () => parseSendRequest({ kind: 'invoice', id: 'nope', requestKey: KEY }),
    Error,
    'invalid_id',
  );
  assertThrows(() => parseSendRequest({ kind: 'invoice', id: ID }), Error, 'invalid_request_key');
  assertThrows(
    () => parseSendRequest({ kind: 'invoice', id: ID, requestKey: KEY, to: 'not-an-email' }),
    Error,
    'invalid_recipient',
  );
  assertThrows(
    () => parseSendRequest({ kind: 'invoice', id: ID, requestKey: KEY, message: 'x'.repeat(2001) }),
    Error,
    'message_too_long',
  );
});

Deno.test('maskEmail hides everything but the first letter and the domain', () => {
  assertEquals(maskEmail('sarah.k@gmail.com'), 's***@gmail.com');
  assertEquals(maskEmail('broken'), '***');
});

Deno.test('formatMoney uses the currency code and its own decimals', () => {
  assertEquals(formatMoney(4235000, 'UGX', 0), 'UGX 4,235,000');
  assertEquals(formatMoney('53.9', 'USD', 2), 'USD 53.90');
});

Deno.test('formatDate reads a calendar date without shifting it', () => {
  assertEquals(formatDate('2026-11-19'), '19 Nov 2026');
});

Deno.test('isPdf checks the magic bytes', () => {
  assert(isPdf(new TextEncoder().encode('%PDF-1.7 rest')));
  assert(!isPdf(new TextEncoder().encode('<html>')));
  assert(!isPdf(new Uint8Array()));
});

Deno.test('sha256Hex and toBase64 match known values', async () => {
  const bytes = new TextEncoder().encode('abc');
  assertEquals(
    await sha256Hex(bytes),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
  assertEquals(toBase64(bytes), 'YWJj');
  // larger than one chunk
  const big = new Uint8Array(100_000).fill(65);
  assertEquals(atob(toBase64(big)).length, 100_000);
});

Deno.test('attachmentName and rpcHttpError', () => {
  assertEquals(attachmentName('invoice', 'SNP-INV-48203917'), 'Invoice-SNP-INV-48203917.pdf');
  assertEquals(rpcHttpError('daily_email_limit_reached: you have sent 50').status, 429);
  assertEquals(rpcHttpError('not_found: document not found').status, 404);
  const hidden = rpcHttpError('some internal detail');
  assertEquals(hidden.status, 500);
  assert(!hidden.message.includes('internal detail'));
});

Deno.test('documentEmail: registered invoice links to Sinnapi, escapes the vendor message', () => {
  const m = documentEmail({
    kind: 'invoice',
    businessName: 'Amani Events',
    recipientName: 'Sarah K.',
    documentNo: 'SNP-INV-48203917',
    amount: 'UGX 2,235,000',
    date: '19 Nov 2026',
    balance: null,
    title: 'Wedding décor',
    vendorMessage: 'Thanks <b>Sarah</b>',
    portal: {
      documentUrl: 'https://app.example/invoices/1',
      messagesUrl: 'https://app.example/messages',
    },
    payThroughSinnapiUrl: null,
    isVendorCopy: false,
  });
  assertEquals(
    m.subject,
    'Invoice SNP-INV-48203917 from Amani Events — UGX 2,235,000 due 19 Nov 2026',
  );
  assert(m.html.includes('https://app.example/invoices/1'));
  assert(m.html.includes('Thanks &lt;b&gt;Sarah&lt;/b&gt;'));
  assert(!m.html.includes('<b>Sarah</b>'));
});

Deno.test('documentEmail: external receipt and the vendor copy', () => {
  const base = {
    kind: 'receipt' as const,
    businessName: 'Amani Events',
    recipientName: 'Kato',
    documentNo: 'SNP-RCT-70415586',
    amount: 'UGX 2,000,000',
    date: '6 Nov 2026',
    balance: 'UGX 2,235,000',
    title: 'Deposit',
    vendorMessage: null,
    portal: null,
    payThroughSinnapiUrl: null,
  };
  const m = documentEmail({ ...base, isVendorCopy: false });
  assertEquals(m.subject, 'Receipt SNP-RCT-70415586 from Amani Events — UGX 2,000,000 received');
  assert(m.text!.includes('Reply to this email'));
  assert(m.text!.includes('Outstanding balance: UGX 2,235,000'));
  assert(documentEmail({ ...base, isVendorCopy: true }).subject.startsWith('Copy: '));
});
