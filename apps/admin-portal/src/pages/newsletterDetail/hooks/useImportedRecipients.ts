import { useCallback, useMemo, useState } from 'react';
import type { NewsletterContact } from '@/lib/types';
import { useContactImport } from './useContactImport';

export type ImportedRecipientsApi = ReturnType<typeof useImportedRecipients>;

/**
 * A parsed spreadsheet, and the decision to actually mail it.
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
 * ── Parsing and applying stay separate acts ───────────────────────────────
 * Parsing produces counts. Applying is a deliberate tick taken after reading
 * them. Merging the two would mean a file that read 380 of 400 rows starts
 * mailing 380 people before anybody noticed the twenty.
 */
export function useImportedRecipients() {
  const { parse, clear, parsing, result, error } = useContactImport();
  const [contacts, setContacts] = useState<NewsletterContact[]>([]);

  /** Everything the file yielded — the candidates, not yet the recipients. */
  const parsed = useMemo(() => result?.contacts ?? [], [result]);

  const chooseFile = useCallback(
    (file: File) => {
      // A new file replaces whatever the previous one contributed: leaving the
      // old contacts applied would mail a list the summary on screen no longer
      // describes.
      setContacts([]);
      void parse(file);
    },
    [parse],
  );

  const clearFile = useCallback(() => {
    clear();
    setContacts([]);
  }, [clear]);

  const apply = useCallback((next: boolean) => setContacts(next ? parsed : []), [parsed]);

  return {
    parsing,
    error,
    result,
    parsed,
    /** The contacts this import contributes to the campaign. */
    contacts,
    applied: contacts.length > 0,
    chooseFile,
    clearFile,
    apply,
  };
}
