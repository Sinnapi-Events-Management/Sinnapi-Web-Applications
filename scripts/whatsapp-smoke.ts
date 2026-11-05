// Send Meta's built-in `hello_world` template to one number, to prove the
// WhatsApp credentials work before any Sinnapi template is approved.
//
// The recipient comes from WHATSAPP_TEST_TO in supabase/functions/.env (E.164,
// e.g. +256772123456), so the number never has to appear in a command or chat.
// With Meta's test sender, the number must be on the "To" list in API Setup.
//
//   deno run --env-file=supabase/functions/.env --allow-env --allow-net scripts/whatsapp-smoke.ts
//
// Optional: pass a template name and language to try one of our own once it is
// approved (blanks are filled with sample text):
//   … scripts/whatsapp-smoke.ts quotation_requested_vendor en 3
import {
  maskPhone,
  sendWhatsAppTemplate,
  whatsAppConfig,
} from '../supabase/functions/_shared/whatsapp.ts';

const config = whatsAppConfig();
if (!config) {
  console.error('WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN are not set.');
  Deno.exit(1);
}

const to = Deno.env.get('WHATSAPP_TEST_TO')?.replace(/[\s().-]/g, '') ?? '';
if (!to) {
  console.error('Add WHATSAPP_TEST_TO=+2567XXXXXXXX to supabase/functions/.env first.');
  Deno.exit(1);
}

const [template = 'hello_world', language = 'en_US', blanks = '0'] = Deno.args;
const bodyParams = Array.from({ length: Number(blanks) || 0 }, (_, i) => `Sample ${i + 1}`);

console.log(`Sending "${template}" (${language}) to ${maskPhone(to)} …`);
const result = await sendWhatsAppTemplate(config, { to, template, language, bodyParams });

if (result.sent) {
  console.log(`Sent. Meta message id: ${result.messageId}`);
} else {
  console.error(`Not sent: [${result.code}] ${result.message} (retryable: ${result.retryable})`);
  Deno.exit(1);
}
