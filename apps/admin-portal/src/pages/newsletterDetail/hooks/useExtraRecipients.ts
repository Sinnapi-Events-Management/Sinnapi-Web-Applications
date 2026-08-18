import { useMemo, useState } from 'react';
import type { NewsletterContact } from '@/lib/types';
import { mergeContacts } from '../schema';
import { useContactListSelection } from './useContactListSelection';
import { useImportedRecipients } from './useImportedRecipients';
import { useManualContacts } from './useManualContacts';

export type ExtraRecipientsApi = ReturnType<typeof useExtraRecipients>;

/**
 * Everyone on a campaign who is not an account holder.
 *
 * Three sources, one set:
 *
 *   typed     entered by hand, name and address, one person at a time
 *   imported  a spreadsheet the operator uploaded in this sitting
 *   list      a saved address book, selected by title
 *
 * ── Why the first two are shipped up and the third is not ─────────────────
 * Typed and imported contacts exist only in this browser tab, so they travel to
 * `admin_newsletter_queue` as a `[{full_name, email}]` payload. A saved list
 * already exists in the database and can be far larger than a page, so it goes
 * by REFERENCE — list id, mode, search, delta — and the server resolves it. The
 * alternative (loading every contact into the tab so it can post them back) is
 * both the slow version and the one that silently mails a page of ten.
 *
 * Overlap between the three is expected and constant — somebody types an
 * address, uploads the spreadsheet it came from, then selects the book that
 * spreadsheet built. `typedAndImported` de-duplicates the two it can see, the
 * RPC de-duplicates all three against each other and against the audience, and
 * `newsletter_recipients` has a unique constraint on (campaign, email) as the
 * last word. Showing one honest number here is what stops the confirmation
 * dialog over-promising.
 *
 * ── Why the three sources' working state is composed here ────────────────
 * The half-typed row, the parsed file and the address-book selection all belong
 * to hooks of their own, but they are all called from this one, not from the
 * three sections that display them. Since the sources became a switcher only
 * one section is mounted at a time, so state held inside a section is state that
 * is thrown away the moment the operator glances at another source — while the
 * recipients it produced remain queued. Holding it a level up makes switching
 * sources a change of view rather than a change of data.
 *
 * ── Why the attestation lives here ────────────────────────────────────────
 * It is the one thing common to all three sources and to nothing else: none of
 * these addresses carries a consent record, whether it was typed thirty seconds
 * ago or saved to a book last year. A saved list makes re-sending easier, which
 * is exactly why re-attesting is not skipped for it — the operator answers for
 * the list at each send, not once when they first uploaded it.
 */
export function useExtraRecipients() {
  const [typedContacts, setTypedContacts] = useState<NewsletterContact[]>([]);
  const [attested, setAttested] = useState(false);

  const manual = useManualContacts({ contacts: typedContacts, onChange: setTypedContacts });
  const imported = useImportedRecipients();
  const listSelection = useContactListSelection();

  const importedContacts = imported.contacts;

  // Typed entries take precedence over imported ones for the same address: the
  // operator typing a name is a more deliberate act than a column in a file.
  const typedAndImported = useMemo(
    () => mergeContacts(typedContacts, importedContacts),
    [typedContacts, importedContacts],
  );

  const listSelectedCount = listSelection.selectedCount;

  /**
   * The headline number.
   *
   * An upper bound, and honestly so: the browser cannot know how many of the
   * selected list already appear among the typed entries, because it does not
   * hold the list. The queue result reports what actually happened, and it is
   * the number the operator confirms against.
   */
  const extraCount = typedAndImported.length + listSelectedCount;

  const needsAttestation = extraCount > 0;

  return {
    /** The by-hand entry form's draft, validation and commit. */
    manual,
    typedContacts,

    /** The spreadsheet: parse state and the contacts it contributes. */
    imported,
    importedContacts,

    /** Everything this tab holds — what "save these to an address book" saves. */
    typedAndImported,

    listSelection,
    listSelectedCount,

    extraCount,
    needsAttestation,
    attested,
    setAttested,

    /** The slice of `admin_newsletter_queue`'s arguments this hook owns. */
    queueArgs: {
      p_extra_contacts: typedAndImported,
      p_attested: attested,
      ...listSelection.queueArgs,
    },
  };
}
