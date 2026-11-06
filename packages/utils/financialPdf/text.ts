/**
 * jsPDF's built-in Helvetica is a WinAnsi (Windows-1252) font: it has Latin
 * letters with accents ("Décor"), the em dash and curly quotes, and nothing
 * outside that. A character it lacks is written as garbage, so every string
 * that reaches the page passes through here first.
 *
 * The minus sign is the common casualty — `−` (U+2212) is not in WinAnsi —
 * so it becomes a hyphen. Anything else unprintable becomes `?`, which is
 * visibly a substitution rather than silently wrong text.
 */

const CP1252_EXTRAS = new Set(
  Array.from('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ').map((c) => c.codePointAt(0)!),
);

function printable(code: number): boolean {
  if (code === 0x09 || code === 0x0a) return true;
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return true;
  return CP1252_EXTRAS.has(code);
}

export function pdfText(value: string | null | undefined): string {
  if (!value) return '';
  let out = '';
  for (const ch of value
    .normalize('NFC')
    .replace(/\u2212/g, '-')
    .replace(/\u00a0|\u202f/g, ' ')) {
    out += printable(ch.codePointAt(0)!) ? ch : '?';
  }
  return out;
}
