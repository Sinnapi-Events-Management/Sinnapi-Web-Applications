import { useCallback, useMemo, useState } from 'react';
import { useContactImport } from './useContactImport';

export type ImportedRecipientsApi = ReturnType<typeof useImportedRecipients>;

/** Nothing excluded — the state a fresh file starts in. */
const NONE = new Set<string>();

/**
 * A parsed spreadsheet, who in it is still ticked, and the decision to mail them.
 *
 * ── Why parse state and applied state live in the same hook ───────────────
 * They used to sit either side of a component boundary: the parse in the
 * section, the applied contacts in `useExtraRecipients`. That was survivable
 * while every source rendered at once, and it stops being survivable the moment
 * the sources became a switcher — the section unmounts when the operator looks
 * at another source, taking the file name, the row counts and the rejected rows
 * with it, while the contacts it produced stay queued. The operator returns to
 * a tab that has forgotten the upload but is still going to send it.
 *
 * Held together here, the whole import survives a look at another source, which
 * is the only reading of "I uploaded a file" that matches what the operator did.
 *
 * ── Parsing, choosing and applying stay separate acts ─────────────────────
 * Parsing produces rows. Choosing is unticking the three people in the file who
 * should not get this one. Applying is a deliberate tick taken after both.
 * Merging any two of them would mean a file that read 380 of 400 rows starts
 * mailing 380 people before anybody noticed the twenty.
 *
 * ── Why exclusions are held as a set of addresses, not as a filtered list ──
 * The parse result is the fact; the exclusions are an opinion about it. Keeping
 * them apart means the preview can always show every row the file yielded —
 * including the unticked ones, greyed rather than vanished — and unticking the
 * last row does not destroy the evidence that a row was there. The address is
 * the key because the parser has already de-duplicated and lowercased on it, so
 * it is unique across the accepted rows by construction.
 */
export function useImportedRecipients() {
  const { parse, clear, parsing, result, error } = useContactImport();
  const [excluded, setExcluded] = useState<Set<string>>(NONE);
  const [applied, setApplied] = useState(false);

  /** Every row the file yielded — the candidates, not yet the recipients. */
  const accepted = useMemo(() => result?.accepted ?? [], [result]);

  const selectedRows = useMemo(
    () => accepted.filter((row) => !excluded.has(row.contact.email)),
    [accepted, excluded],
  );

  const selectedContacts = useMemo(() => selectedRows.map((row) => row.contact), [selectedRows]);

  const reset = useCallback(() => {
    setExcluded(NONE);
    setApplied(false);
  }, []);

  const chooseFile = useCallback(
    (file: File) => {
      // A new file replaces whatever the previous one contributed: leaving the
      // old contacts applied would mail a list the preview on screen no longer
      // describes, and carrying its exclusions over would untick rows in this
      // file for reasons that belonged to the last one.
      reset();
      void parse(file);
    },
    [parse, reset],
  );

  const clearFile = useCallback(() => {
    clear();
    reset();
  }, [clear, reset]);

  const toggleRow = useCallback((email: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (!next.delete(email)) next.add(email);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (next: boolean) => setExcluded(next ? NONE : new Set(accepted.map((row) => row.contact.email))),
    [accepted],
  );

  const isRowSelected = useCallback((email: string) => !excluded.has(email), [excluded]);

  const selectedCount = selectedRows.length;

  /**
   * What this import contributes to the campaign.
   *
   * Live against the ticks: unticking somebody after applying removes them from
   * the send, rather than leaving a queued list that no longer matches the
   * table the operator is looking at.
   */
  const contacts = useMemo(() => (applied ? selectedContacts : []), [applied, selectedContacts]);

  return {
    parsing,
    error,
    result,

    /** Every accepted row, ticked or not — what the preview table renders. */
    accepted,
    acceptedCount: accepted.length,

    /** Row-level exclusion. */
    isRowSelected,
    toggleRow,
    toggleAll,
    selectedCount,
    selectedContacts,
    allSelected: accepted.length > 0 && selectedCount === accepted.length,
    someSelected: selectedCount > 0 && selectedCount < accepted.length,

    contacts,
    // A file with every row unticked is not an applied file, whatever the
    // checkbox was last told: the campaign is getting nobody from it.
    applied: applied && selectedCount > 0,
    apply: setApplied,

    chooseFile,
    clearFile,
  };
}
