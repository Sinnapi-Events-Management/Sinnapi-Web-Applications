import { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import type { NewsletterContact } from '@/lib/types';
import {
  EMAIL_HEADERS,
  EMAIL_RE,
  FIRST_NAME_HEADERS,
  LAST_NAME_HEADERS,
  NAME_HEADERS,
  normalizeContact,
  normalizeHeader,
  type ImportRejectionReason,
} from '../schema';

/** A contact the file yielded, with the sheet row it came from. */
export type ImportedContactRow = {
  /** 1-based row number in the sheet, so the operator can go and look at it. */
  row: number;
  contact: NewsletterContact;
};

export type ImportRejection = {
  /** 1-based row number in the sheet, so the operator can go and look at it. */
  row: number;
  value: string;
  reason: ImportRejectionReason;
};

export type ContactImportResult = {
  /** Complete, unique, lowercased pairs — everything the campaign can use. */
  accepted: ImportedContactRow[];
  /**
   * Every row that held data but no usable contact, with why.
   *
   * Complete, not truncated: the preview puts these in a table the operator
   * pages through, and a list that quietly stops at fifty is one where row 51
   * is a person nobody ever finds out was dropped.
   */
  rejected: ImportRejection[];
  /** Addresses that appeared more than once in the file. */
  duplicates: number;
  /** Rows read, before any rule was applied. */
  rowsRead: number;
  /** The headers the parser matched, echoed back so a mis-mapping is visible. */
  columns: { name: string; email: string };
  /** Headers that were read and discarded — "Company", "Phone", "Notes". */
  ignoredColumns: string[];
  fileName: string;
  sheetName: string;
};

/** Cap on rows read from one file. */
const MAX_ROWS = 50_000;

/** How far down the sheet to look for the header row. */
const HEADER_SCAN_ROWS = 15;

const MISSING_COLUMNS =
  'This file needs a name column and an email column. Add headers — “Name” and “Email”, or “First name” / “Last name” and “Email” — and upload it again.';

type Mapping = {
  headerRow: number;
  email: number;
  name: number | null;
  first: number | null;
  last: number | null;
  nameLabel: string;
  emailLabel: string;
  /** The headers on that row this parser has no use for. */
  ignored: string[];
};

/**
 * Find the header row and the columns that matter.
 *
 * Scanning a few rows instead of assuming row 1 is not indulgence: real exports
 * open with a merged title, a blank spacer, or a "generated on…" line, and the
 * headers land on row 3. The first row containing BOTH an email header and a
 * name header wins, which is a stricter test than either alone and so cannot be
 * satisfied by a stray cell that happens to say "name".
 *
 * Everything else on that row is recorded rather than merely skipped. A CRM
 * export arrives with a dozen columns and only two are mailed; naming the ten
 * that were dropped is what lets an operator see that the file they meant to
 * upload — the one where the addresses live under "Work email" — was read from
 * the wrong column, instead of discovering it in a send.
 */
function findMapping(grid: unknown[][]): Mapping | null {
  const limit = Math.min(grid.length, HEADER_SCAN_ROWS);

  for (let r = 0; r < limit; r++) {
    const cells = (grid[r] ?? []).map(normalizeHeader);
    if (cells.length === 0) continue;

    const email = cells.findIndex((c) => EMAIL_HEADERS.includes(c));
    if (email === -1) continue;

    const name = cells.findIndex((c) => NAME_HEADERS.includes(c));
    const first = cells.findIndex((c) => FIRST_NAME_HEADERS.includes(c));
    const last = cells.findIndex((c) => LAST_NAME_HEADERS.includes(c));

    // A single "Name" column, or a first/last pair — the two shapes every CRM
    // and sign-up sheet export exists in.
    if (name === -1 && first === -1) continue;

    const used = new Set([email, name, first, last].filter((i) => i !== -1));
    const ignored = Array.from(
      new Set(
        (grid[r] ?? [])
          .map((cell, i) => (used.has(i) ? '' : String(cell ?? '').trim()))
          .filter((label) => label.length > 0),
      ),
    );

    return {
      headerRow: r,
      email,
      name: name === -1 ? null : name,
      first: first === -1 ? null : first,
      last: last === -1 ? null : last,
      nameLabel:
        name !== -1
          ? String(grid[r]?.[name] ?? 'Name')
          : [grid[r]?.[first], last !== -1 ? grid[r]?.[last] : null]
              .filter(Boolean)
              .map(String)
              .join(' + '),
      emailLabel: String(grid[r]?.[email] ?? 'Email'),
      ignored,
    };
  }

  return null;
}

function readName(row: unknown[], mapping: Mapping): string {
  if (mapping.name !== null) return String(row[mapping.name] ?? '');
  const first = mapping.first !== null ? String(row[mapping.first] ?? '') : '';
  const last = mapping.last !== null ? String(row[mapping.last] ?? '') : '';
  return `${first} ${last}`.trim();
}

/**
 * Parse a spreadsheet or CSV of contacts.
 *
 * ── Why this demands headers, when it used to scan every cell ──────────────
 * The old importer walked the whole sheet and took anything shaped like an
 * address, which was genuinely more forgiving of the files people have. What it
 * could not do is say WHO an address belonged to: an address on its own has no
 * name next to it that a parser can be sure about, so every uploaded recipient
 * landed nameless. That is a send record that cannot say who was mailed, a
 * saved address book whose rows nobody can identify later, and a renderer that
 * can never greet anybody by name because the name was never captured.
 *
 * So the trade is deliberate: a named column costs the operator one edit to
 * their file, once, and buys a name on every recipient forever. The aliases in
 * `schema/contacts.ts` keep that edit rare — "Full Name", "e-mail address" and
 * a first/last pair are all understood — and a file that genuinely has no names
 * is rejected with a message that says what to add, rather than silently
 * importing half a contact.
 *
 * ── Why the result is rows, not just contacts ─────────────────────────────
 * Every accepted contact carries the sheet row it came from, and every rejected
 * one does too. Counts alone ("380 contacts") are a claim the operator has no
 * way to check; rows are the evidence, and the row number is the coordinate
 * they need because the fix happens back in Excel.
 *
 * Parsing is entirely client-side: the contacts only leave the browser when the
 * operator saves them to an address book or queues the campaign, so an
 * abandoned upload leaves nothing behind.
 */
export function useContactImport() {
  const [result, setResult] = useState<ContactImportResult | null>(null);
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

      // `header: 1` gives raw rows so the header row can be located rather than
      // assumed. `blankrows: false` drops the spacer rows a decorative export
      // is full of, which would otherwise shift every row number reported back.
      let mapping: Mapping | null = null;
      let grid: unknown[][] = [];
      let sheetName = '';

      // The contacts are rarely on the first sheet of a workbook that also
      // holds "Instructions" and "Pivot". Take the first sheet that actually
      // has both columns.
      for (const name of workbook.SheetNames) {
        const candidate = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
          header: 1,
          blankrows: false,
        });
        const found = findMapping(candidate);
        if (found) {
          mapping = found;
          grid = candidate;
          sheetName = name;
          break;
        }
      }

      if (!mapping) {
        setError(MISSING_COLUMNS);
        setResult(null);
        return;
      }

      const seen = new Set<string>();
      const accepted: ImportedContactRow[] = [];
      const rejected: ImportRejection[] = [];
      let duplicates = 0;
      let rowsRead = 0;

      for (let r = mapping.headerRow + 1; r < grid.length && rowsRead < MAX_ROWS; r++) {
        const row = grid[r] ?? [];
        const rawEmail = String(row[mapping.email] ?? '').trim();
        const rawName = readName(row, mapping).trim();
        if (!rawEmail && !rawName) continue;

        rowsRead++;
        const sheetRow = r + 1;
        const contact = normalizeContact({ full_name: rawName, email: rawEmail });

        if (!contact.email) {
          rejected.push({ row: sheetRow, value: rawName, reason: 'no-email' });
          continue;
        }
        if (!EMAIL_RE.test(contact.email)) {
          rejected.push({ row: sheetRow, value: rawEmail, reason: 'invalid-email' });
          continue;
        }
        if (!contact.full_name) {
          // The row that makes this importer worth its stricter rules: an
          // address with nobody attached is exactly what used to slip through.
          rejected.push({ row: sheetRow, value: contact.email, reason: 'no-name' });
          continue;
        }
        if (seen.has(contact.email)) {
          duplicates++;
          continue;
        }

        seen.add(contact.email);
        accepted.push({ row: sheetRow, contact });
      }

      setResult({
        accepted,
        rejected,
        duplicates,
        rowsRead,
        columns: { name: mapping.nameLabel, email: mapping.emailLabel },
        ignoredColumns: mapping.ignored,
        fileName: file.name,
        sheetName,
      });
    } catch {
      setError('That file could not be read. Upload a .xlsx, .xls or .csv file.');
      setResult(null);
    } finally {
      setParsing(false);
    }
  }, []);

  return { parse, parsing, result, error, clear };
}
