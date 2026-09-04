#!/usr/bin/env node
/**
 * Register Sinnapi's Pesapal IPN URL and print the id to put in PESAPAL_IPN_ID.
 *
 *   yarn pesapal:ipn --env sandbox --project-ref abcdefghijklmnop
 *   yarn pesapal:ipn --env live --url https://api.sinnapi.com/functions/v1/psp-pesapal-webhook
 *   yarn pesapal:ipn --env sandbox --project-ref abcdefghijklmnop --list
 *
 * Credentials come from PESAPAL_CONSUMER_KEY / PESAPAL_CONSUMER_SECRET in the
 * environment, or from a KEY=value file given with --env-file (for example
 * supabase/functions/.env). The secret is never printed.
 *
 * Why this exists: nothing in the functions calls RegisterIPN. Pesapal only
 * notifies a URL it has been told about, and it identifies that URL by the id
 * it hands back here — which is bound to one environment (sandbox or live)
 * and one exact URL. Deploy to a new project ref, put the API behind a custom
 * domain, or move from sandbox to live, and the old id points at nothing:
 * every checkout still succeeds, no notification ever arrives, and no escrow
 * is ever funded. Re-run this whenever the webhook URL changes.
 *
 * Print-only by design. It touches nothing on the Supabase project; the last
 * line is the exact `supabase secrets set` to run once you have read the id.
 */
import { readFileSync } from 'node:fs';

const BASES = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
};

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  usage();
  process.exit(0);
}

if (args['env-file']) loadEnvFile(args['env-file']);

const env = args.env ?? (process.env.PESAPAL_BASE_URL?.includes('cybqa') ? 'sandbox' : null);
if (!env || !BASES[env]) {
  fail('Pass --env sandbox or --env live (which credentials, and which Pesapal API).');
}
const base = args['base-url'] ?? BASES[env];

const key = process.env.PESAPAL_CONSUMER_KEY;
const secret = process.env.PESAPAL_CONSUMER_SECRET;
if (!key || !secret) {
  fail(
    'PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in the environment, ' +
      'or in the file given with --env-file.',
  );
}

const method = (args.method ?? 'POST').toUpperCase();
if (method !== 'GET' && method !== 'POST') fail('--method must be GET or POST.');

const url = resolveWebhookUrl(args);
if (!url && !args.list) {
  fail('Pass --project-ref <ref> (Supabase project) or --url <full IPN URL> for the webhook.');
}

const token = await requestToken(base, key, secret);

if (!args.list) {
  const registered = await registerIpn(base, token, url, method);
  console.log('');
  console.log(`Registered on ${env} (${base})`);
  console.log(`  url:     ${registered.url}`);
  console.log(`  method:  ${registered.ipn_notification_type_description ?? method}`);
  console.log(`  status:  ${registered.ipn_status_description ?? registered.status ?? 'unknown'}`);
  console.log(`  ipn_id:  ${registered.ipn_id}`);
}

const list = await getIpnList(base, token);
console.log('');
console.log(`All IPN URLs registered on this ${env} merchant (${list.length}):`);
for (const row of list) {
  const marker = url && sameUrl(row.url, url) ? ' <- this URL' : '';
  console.log(`  ${row.ipn_id}  ${row.url}  (${row.created_date ?? ''})${marker}`);
}

const matching = url ? list.filter((r) => sameUrl(r.url, url)) : [];
if (url && matching.length === 0 && !args.list) {
  console.log('');
  console.log(
    'Warning: the URL just registered is not in the list Pesapal returned. Re-run with --list.',
  );
}
if (matching.length > 1) {
  console.log('');
  console.log(
    `Note: ${matching.length} ids point at this URL. Any of them works; the newest is the one printed above.`,
  );
}

const chosen = !args.list
  ? null
  : matching.sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)))[0];
const ipnId = !args.list ? undefined : chosen?.ipn_id;

console.log('');
if (!args.list || ipnId) {
  console.log('Now set the secret on the SAME project the URL points at:');
  console.log('');
  console.log(
    `  supabase secrets set PESAPAL_IPN_ID=${ipnId ?? '<ipn_id above>'} PESAPAL_BASE_URL=${base}`,
  );
  console.log('');
  console.log('Then redeploy nothing — functions read secrets at request time — and send one');
  console.log(
    'sandbox payment through to confirm a row lands in payment_logs with event_type=ipn.',
  );
} else if (url) {
  console.log(`No registered IPN points at ${url}. Run again without --list to register it.`);
}

// ---------------------------------------------------------------------------

async function requestToken(base, consumerKey, consumerSecret) {
  const res = await fetch(`${base}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.token) {
    fail(
      `Pesapal refused the credentials (${res.status}): ${body?.error?.message ?? body?.message ?? 'no detail'}. ` +
        `Check that the key pair is for ${env}.`,
    );
  }
  return body.token;
}

async function registerIpn(base, bearer, ipnUrl, notificationType) {
  const res = await fetch(`${base}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: notificationType }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ipn_id) {
    fail(`RegisterIPN failed (${res.status}): ${body?.error?.message ?? JSON.stringify(body)}`);
  }
  return body;
}

async function getIpnList(base, bearer) {
  const res = await fetch(`${base}/api/URLSetup/GetIpnList`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${bearer}` },
  });
  const body = await res.json().catch(() => []);
  if (!res.ok) fail(`GetIpnList failed (${res.status}): ${JSON.stringify(body)}`);
  return Array.isArray(body) ? body : [];
}

function resolveWebhookUrl(a) {
  if (a.url) {
    try {
      const u = new URL(a.url);
      if (u.protocol !== 'https:' && u.hostname !== 'localhost') {
        fail('The IPN URL must be https — Pesapal will not deliver to plain http.');
      }
      return u.toString();
    } catch (e) {
      if (e instanceof TypeError) fail(`--url is not a valid URL: ${a.url}`);
      throw e;
    }
  }
  if (a['project-ref']) {
    if (!/^[a-z]{20}$/.test(a['project-ref'])) {
      fail('--project-ref should be the 20-letter Supabase project ref (from the dashboard URL).');
    }
    return `https://${a['project-ref']}.supabase.co/functions/v1/psp-pesapal-webhook`;
  }
  return null;
}

function sameUrl(a, b) {
  return (
    String(a).replace(/\/+$/, '').toLowerCase() === String(b).replace(/\/+$/, '').toLowerCase()
  );
}

function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    fail(`Could not read --env-file ${path}`);
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip an inline comment and surrounding quotes, the way dotenv does.
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, '');
    value = value.replace(/^(["'])(.*)\1$/, '$2');
    if (!(name in process.env)) process.env[name] = value;
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) fail(`Unexpected argument: ${a}`);
    const name = a.slice(2);
    if (name === 'list' || name === 'help') {
      out[name] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) fail(`--${name} needs a value.`);
    out[name] = value;
    i++;
  }
  return out;
}

function usage() {
  console.log(`Usage: yarn pesapal:ipn --env <sandbox|live> (--project-ref <ref> | --url <https url>) [options]

Options:
  --env <sandbox|live>   Which Pesapal API and which credentials. Required.
  --project-ref <ref>    Supabase project ref; the URL becomes
                         https://<ref>.supabase.co/functions/v1/psp-pesapal-webhook
  --url <url>            The full IPN URL instead (custom domain, tunnel).
  --method <GET|POST>    How Pesapal calls the URL. Default POST.
  --env-file <path>      KEY=value file to read the consumer key/secret from.
  --base-url <url>       Override the Pesapal API base for --env.
  --list                 Only list what is registered; register nothing.
  --help                 This text.`);
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
