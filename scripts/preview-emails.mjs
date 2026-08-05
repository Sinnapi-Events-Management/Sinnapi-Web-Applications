#!/usr/bin/env node
/**
 * Render every Sinnapi transactional email to disk so you can eyeball them in a
 * browser (or paste the HTML into Litmus / Email on Acid) before deploying.
 *
 *   yarn email:preview            # render, then open the index
 *   yarn email:preview --no-open  # render only
 *
 * Output lands in `.email-preview/` (git-ignored):
 *   index.html          side-by-side gallery of every template
 *   <name>.html         the exact HTML that goes on the wire
 *   <name>.txt          the plain-text alternative
 *
 * How it works: the Edge Functions are Deno TypeScript, so this script uses the
 * repo's existing `typescript` dependency to transpile the template + content
 * modules in memory and loads them through a small ESM loader that resolves
 * `.ts` specifiers. Only the I/O-free `_shared/emailTemplate.ts` layer is
 * pulled in — never `_shared/email.ts` — so nodemailer is never imported.
 *
 * The `cid:` logo reference is rewritten to a data: URI for preview only, so
 * the mark shows up in a browser. Real sends attach it as a MIME part.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS = resolve(ROOT, 'supabase/functions');
const OUT = resolve(ROOT, '.email-preview');

// ── Minimal Deno-TS module loader ──────────────────────────────────────────
// Transpiles a `.ts` file, recursively resolving its relative `.ts` imports,
// and evaluates the result. Enough for these dependency-free modules.
const moduleCache = new Map();

async function loadTs(absPath) {
  if (moduleCache.has(absPath)) return moduleCache.get(absPath);

  const source = readFileSync(absPath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      // Preserve `import type` elision so the type-only imports don't become
      // runtime requires for interfaces that don't exist at runtime.
      isolatedModules: true,
    },
    fileName: absPath,
  });

  // Rewrite relative `./x.ts` specifiers to data: URLs of the already-loaded
  // dependency, so the whole graph evaluates without touching disk resolution.
  const deps = [...outputText.matchAll(/from\s+['"](\.[^'"]+\.ts)['"]/g)].map((m) => m[1]);
  let code = outputText;
  for (const spec of deps) {
    const depPath = resolve(dirname(absPath), spec);
    const depUrl = await loadTs(depPath);
    code = code.replaceAll(`'${spec}'`, `'${depUrl}'`).replaceAll(`"${spec}"`, `"${depUrl}"`);
  }

  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  moduleCache.set(absPath, url);
  return url;
}

const importTs = async (rel) => import(await loadTs(resolve(FUNCTIONS, rel)));

// ── Fixtures ───────────────────────────────────────────────────────────────
// Deliberately awkward values: a long business name that must wrap, an
// apostrophe + ampersand that must escape, and a password with the ambiguous
// glyphs (l/1/I, 0/O) the monospace chip exists to disambiguate.
const PORTAL = 'https://admin.sinnapi.com';

const APPLICANT = {
  ownerFullName: 'Nakato Rebecca Ssemwanga',
  ownerEmail: 'rebecca@bellaevents.co.ug',
  businessName: "Bella's Bloom & Banquet Co.",
  submissionRef: 'VA-2026-0731-K4M9',
};

async function collect() {
  const vendor = await importTs('vendor-application/emails.ts');
  const staff = await importTs('create-staff/emails.ts');
  const reset = await importTs('reset-staff-password/emails.ts');
  const notify = await importTs('notification-dispatch/emails.ts');
  const triage = await importTs('set-intake-status/emails.ts');
  const promote = await importTs('promote-intake/emails.ts');
  const signup = await importTs('client-sign-up/emails.ts');
  const recovery = await importTs('send-password-reset/emails.ts');

  // A multi-line, admin-authored rejection reason: it must escape and keep its
  // line breaks when it lands in the applicant's inbox.
  const REJECT_REASON =
    'The National ID you uploaded was too blurred to read.\n' +
    "We also couldn't verify the business registration number against URSB records.";

  // Both framings of the same template — the first-send copy and the resend
  // copy diverge only in their opening line and subject, which is exactly the
  // kind of difference that goes unnoticed unless the two sit side by side.
  const CONFIRM_LINK =
    'https://app.sinnapi.com/auth/callback?token_hash=pkce_2f8c1a94e7b3&type=signup';

  return [
    {
      name: 'client-confirm-signup',
      title: 'Client · confirm your email',
      flow: 'client-sign-up',
      msg: signup.confirmSignupEmail({
        fullName: 'Aisha Namubiru',
        email: 'aisha.namubiru@example.com',
        confirmUrl: CONFIRM_LINK,
        expiryHours: 24,
      }),
    },
    {
      name: 'client-confirm-signup-resend',
      title: 'Client · confirm your email (resend)',
      flow: 'client-sign-up',
      msg: signup.confirmSignupEmail({
        fullName: 'Aisha Namubiru',
        email: 'aisha.namubiru@example.com',
        confirmUrl: CONFIRM_LINK.replace('type=signup', 'type=magiclink'),
        expiryHours: 24,
        resend: true,
      }),
    },
    {
      name: 'client-password-reset',
      title: 'Account · admin-triggered password reset',
      flow: 'send-password-reset',
      msg: recovery.passwordResetEmail({
        fullName: 'Aisha Namubiru',
        email: 'aisha.namubiru@example.com',
        resetUrl:
          'https://app.sinnapi.com/reset-password?token_hash=pkce_9d41b7c02e5a&type=recovery',
        portalName: 'Sinnapi',
        expiryHours: 24,
      }),
    },
    {
      name: 'vendor-applicant-confirmation',
      title: 'Vendor · applicant confirmation',
      flow: 'vendor-application',
      msg: vendor.applicantConfirmationEmail(APPLICANT),
    },
    {
      name: 'vendor-internal-notification',
      title: 'Vendor · internal team notice',
      flow: 'vendor-application',
      msg: vendor.internalNotificationEmail('team@sinnapi.com', APPLICANT),
    },
    {
      name: 'staff-welcome',
      title: 'Staff · welcome + temp password',
      flow: 'create-staff',
      msg: staff.staffWelcomeEmail({
        fullName: 'Joseph Kato',
        email: 'joseph.kato@sinnapi.com',
        tempPassword: 'Xk7-Pl0I1-9Qz',
        portalUrl: PORTAL,
        roleNames: ['Finance', 'Vendor Operations'],
      }),
    },
    {
      name: 'staff-password-reset',
      title: 'Staff · password reset',
      flow: 'reset-staff-password',
      msg: reset.staffPasswordResetEmail({
        fullName: 'Joseph Kato',
        email: 'joseph.kato@sinnapi.com',
        tempPassword: 'Rt4-Nb8O0-2Wj',
        portalUrl: PORTAL,
      }),
    },
    ...['reviewing', 'submitted'].map((status) => ({
      name: `intake-${status}`,
      title: `Intake · ${status}`,
      flow: 'set-intake-status',
      msg: triage.intakeStatusEmail(status, APPLICANT),
    })),
    {
      name: 'intake-rejected',
      title: 'Intake · rejected (with reason)',
      flow: 'set-intake-status',
      msg: triage.intakeStatusEmail('rejected', { ...APPLICANT, reason: REJECT_REASON }),
    },
    {
      name: 'intake-approved-new-account',
      title: 'Intake · approved (new account)',
      flow: 'promote-intake',
      msg: promote.vendorApprovedEmail({
        ownerFullName: APPLICANT.ownerFullName,
        ownerEmail: APPLICANT.ownerEmail,
        businessName: APPLICANT.businessName,
        portalUrl: 'https://vendors.sinnapi.com',
        tempPassword: 'Qm5-Zt2K7-4Hd',
      }),
    },
    {
      name: 'intake-approved-existing-account',
      title: 'Intake · approved (existing account)',
      flow: 'promote-intake',
      msg: promote.vendorApprovedEmail({
        ownerFullName: APPLICANT.ownerFullName,
        ownerEmail: APPLICANT.ownerEmail,
        businessName: APPLICANT.businessName,
        portalUrl: 'https://vendors.sinnapi.com',
        tempPassword: null,
      }),
    },
    ...['booking.status', 'payment.status', 'message.new', 'unmapped.trigger.key'].map((key) => ({
      name: `notification-${key.replace(/\./g, '-')}`,
      title: `Notification · ${key}`,
      flow: 'notification-dispatch',
      msg: notify.notificationEmail('client@example.com', key),
    })),
  ];
}

// ── Render ─────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

async function main() {
  const { LOGO_CID, LOGO_PNG_BASE64 } = await importTs('_shared/logo.ts');
  const logoDataUri = `data:image/png;base64,${LOGO_PNG_BASE64}`;
  const templates = await collect();

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const cards = [];
  for (const { name, title, flow, msg } of templates) {
    // Preview-only: browsers can't resolve cid:, real sends attach a MIME part.
    const html = msg.html.replaceAll(`cid:${LOGO_CID}`, logoDataUri);
    writeFileSync(resolve(OUT, `${name}.html`), html);
    writeFileSync(resolve(OUT, `${name}.txt`), msg.text ?? '(no plain-text part)');

    const bytes = Buffer.byteLength(msg.html, 'utf8');
    const warn = !msg.text ? ' <span class="warn">no text part</span>' : '';
    // Gmail clips messages past 102 KB; the logo rides along as a separate
    // MIME part, so only the HTML body counts toward that budget.
    const clip = bytes > 102_000 ? ' <span class="warn">over Gmail 102KB clip limit</span>' : '';
    cards.push(`
      <section class="card">
        <header>
          <h2>${esc(title)}</h2>
          <p class="meta">${esc(flow)} &middot; ${(bytes / 1024).toFixed(1)} KB HTML${warn}${clip}</p>
          <p class="subj"><strong>Subject:</strong> ${esc(msg.subject)}</p>
          <p class="links">
            <a href="./${name}.html" target="_blank" rel="noreferrer">open HTML</a>
            <a href="./${name}.txt" target="_blank" rel="noreferrer">plain text</a>
          </p>
        </header>
        <iframe src="./${name}.html" title="${esc(title)}" loading="lazy"></iframe>
      </section>`);
  }

  const index = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sinnapi email templates — preview</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; padding:32px; background:#12121a; color:#e8e6ee;
         font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; }
  h1 { margin:0 0 6px; font-size:24px; }
  .lede { margin:0 0 28px; color:#9a93a6; max-width:62ch; }
  .grid { display:grid; gap:24px; grid-template-columns:repeat(auto-fill,minmax(420px,1fr)); }
  .card { background:#1c1b26; border:1px solid #2e2c3b; border-radius:12px; overflow:hidden; }
  header { padding:16px 18px; border-bottom:1px solid #2e2c3b; }
  h2 { margin:0 0 4px; font-size:16px; color:#fff; }
  .meta { margin:0 0 8px; font-size:12px; color:#8f8a9c; text-transform:uppercase; letter-spacing:.5px; }
  .subj { margin:0 0 10px; font-size:13px; color:#c9c4d4; }
  .links a { color:#8CC3C8; font-size:13px; margin-right:14px; }
  .warn { color:#ffb4a2; text-transform:none; letter-spacing:0; }
  iframe { width:100%; height:760px; border:0; background:#fff; display:block; }
</style></head>
<body>
  <h1>Sinnapi transactional email templates</h1>
  <p class="lede">Rendered from the live Edge Function sources. The logo is inlined as a
  data: URI here for browser preview only — real sends attach it as a Content-ID MIME part.
  For true client testing, open an individual HTML file and paste it into Litmus or Email on Acid.</p>
  <div class="grid">${cards.join('')}</div>
</body></html>`;

  writeFileSync(resolve(OUT, 'index.html'), index);

  console.log(`Rendered ${templates.length} templates -> ${relative(ROOT, OUT)}/`);
  for (const t of templates) console.log(`  ${t.name}.html`);

  if (!process.argv.includes('--no-open') && process.platform === 'darwin') {
    execFileSync('open', [resolve(OUT, 'index.html')]);
  } else {
    console.log(`\nOpen: ${pathToFileURL(resolve(OUT, 'index.html')).href}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
