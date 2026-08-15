// data-export — user-invoked, self-service. Assembles everything Sinnapi holds
// about the caller into a typeset PDF and returns it to their browser.
//
// This is the right-of-access half of the settings page's privacy card; its
// sibling is the erasure request, which the portals write straight to
// `erasure_requests` under RLS and needs no function.
//
// WHY A FUNCTION AND NOT A CLIENT-SIDE ASSEMBLY
// The portals could read most of this themselves — RLS already scopes it — and
// zip it into JSON in the browser. Two things argue against it. A data-access
// response is a compliance artefact: it should look like one, be readable by
// the person who asked without a JSON viewer, and be identical whichever portal
// produced it. And the assembly is one description of "everything we hold",
// which belongs in one place rather than being maintained twice in two SPAs
// that already disagree about which tables they know.
//
// WHY THE CALLER'S CLIENT, NOT service_role
// See `queries.ts`. The whole operation is "dump everything about this one
// person", so the failure that matters is a widened scope; under RLS the
// database enforces the scope and a missing filter can only return less.
//
// WHY BASE64 AND NOT RAW BYTES
// `supabase.functions.invoke` decodes by content type, and the portals' shared
// `invokeFunction` helper unwraps our `{ error }` JSON shape on failure. A
// binary success body would need a second, different transport path on the
// client for the same call. The 33% inflation is paid once on a file the user
// asked for and waits for.
import { handler, json } from '../_shared/http.ts';
import { userClient, requireUser, HttpError } from '../_shared/supabase.ts';
import { loadExportData } from './queries.ts';
import { buildExportPdf, exportFileName } from './document.ts';

/**
 * Refuse to emit anything past this. A PDF large enough to hit it is a symptom
 * — a runaway section, or an account whose message history belongs in a
 * different delivery mechanism — and returning it base64-encoded through the
 * function gateway would fail less legibly than saying so.
 */
const MAX_BYTES = 12 * 1024 * 1024;

/** Uint8Array → base64, in chunks: `String.fromCharCode(...bytes)` blows the stack on megabytes. */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');

    const userId = await requireUser(req);
    const db = userClient(req);

    const generatedAt = new Date();
    const data = await loadExportData(db, userId);

    // A caller whose own profile row is unreadable is not in a state where an
    // "everything about you" document means anything — fail rather than emit a
    // cover page addressed to nobody.
    if (!data.profile) throw new HttpError(404, 'profile_not_found');

    const bytes = await buildExportPdf(data, generatedAt);
    if (bytes.byteLength > MAX_BYTES) throw new HttpError(413, 'export_too_large');

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'data_export_generated',
        profile_id: userId,
        bytes: bytes.byteLength,
      }),
    );

    return json(req, {
      fileName: exportFileName(generatedAt),
      mimeType: 'application/pdf',
      base64: toBase64(bytes),
    });
  }),
);
