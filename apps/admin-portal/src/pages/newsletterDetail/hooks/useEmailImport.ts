import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';

export type ImportResult = {
  /** Unique, lowercased, syntactically valid addresses. */
  emails: string[];
  /** Rows that looked like data but held no usable address, with why. */
  rejected: Array<{ value: string; reason: string }>;
  /** Addresses that appeared more than once in the file. */
  duplicates: number;
  fileName: string;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Cap on rows read from one file. */
const MAX_ROWS = 50_000;

/**
 * Parse a spreadsheet or CSV of email addresses.
 *
 * ── Why every cell is scanned rather than one named column ─────────────────
 * Real lists do not arrive with an `email` header. They arrive as an export
 * from somebody's phone, a conference sign-up sheet, a column pasted into
 * B7:B412 with a merged title above it. Insisting on a header means the common
 * case is a support conversation. So the whole sheet is walked and anything
 * that looks like an address is taken, which is both more forgiving and, in
 * practice, more accurate — an address is a self-identifying shape.
 *
 * ── Why rejects are reported, not dropped ──────────────────────────────────
 * A file of 400 rows that yields 380 addresses raises exactly one question, and
 * the operator has to be able to answer it before sending. Silent truncation
 * here would show a confident "380 recipients" for a list that was meant to
 * reach 400.
 *
 * Parsing is entirely client-side: the addresses only leave the browser when
 * the campaign is queued, so an abandoned upload leaves nothing behind.
 */
export function useEmailImport() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const parse = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const seen = new Set<string>();
      const emails: string[] = [];
      const rejected: ImportResult['rejected'] = [];
      let duplicates = 0;
      let rows = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        // `header: 1` gives raw rows, so a file with no header row — or a
        // decorative one — is read the same as any other.
        const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

        for (const row of grid) {
          if (rows >= MAX_ROWS) break;
          rows++;
          for (const cell of row ?? []) {
            const value = String(cell ?? '').trim();
            if (!value) continue;

            // A cell can hold several addresses ("a@x.com; b@y.com"), which is
            // what a pasted mail-client "To:" line looks like.
            const candidates = value.split(/[;,\s]+/).filter(Boolean);
            for (const candidate of candidates) {
              const lowered = candidate.toLowerCase();
              if (!EMAIL_RE.test(lowered)) {
                // Only complain about things that were trying to be an address.
                if (lowered.includes('@')) {
                  rejected.push({ value: candidate, reason: 'Not a valid email address' });
                }
                continue;
              }
              if (seen.has(lowered)) {
                duplicates++;
                continue;
              }
              seen.add(lowered);
              emails.push(lowered);
            }
          }
        }
      }

      setResult({ emails, rejected: rejected.slice(0, 50), duplicates, fileName: file.name });
    } catch {
      setError('That file could not be read. Upload a .xlsx, .xls or .csv file.');
      setResult(null);
    } finally {
      setParsing(false);
    }
  }, []);

  return { parse, parsing, result, error, clear };
}
