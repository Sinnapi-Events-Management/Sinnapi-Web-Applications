import { useCallback, useState } from 'react';
import type { NewsletterContact } from '@/lib/types';
import { contactIssue, normalizeContact } from '../schema';

export type ManualContactsApi = ReturnType<typeof useManualContacts>;

type Options = {
  /** The contacts already entered — owned by `useExtraRecipients`, not here. */
  contacts: NewsletterContact[];
  onChange: (next: NewsletterContact[]) => void;
};

const EMPTY: NewsletterContact = { full_name: '', email: '' };

/**
 * The name-and-address entry form's state.
 *
 * ── Why this hook owns only the draft, never the list ──────────────────────
 * The committed contacts live in `useExtraRecipients` alongside the imported
 * and saved-list ones, because that is where they are merged, counted and
 * turned into the queue payload. A second copy here would have to be kept in
 * step with an effect, and a sync effect between two pieces of state is how a
 * screen ends up sending a list that differs from the one on display. What this
 * hook owns is the half-typed row and the message under it — genuinely local,
 * genuinely transient.
 *
 * ── Why entry is a form and no longer a chip field ─────────────────────────
 * The old input took pasted addresses and split them on commas, which was fast
 * and produced nameless recipients. A name cannot be recovered from a pasted
 * "a@x.com; b@y.com" string, so the paste shortcut and the requirement that
 * every recipient have a name cannot both survive. Anyone with a list long
 * enough to want pasting has a spreadsheet, and that is what the importer is
 * for.
 */
export function useManualContacts({ contacts, onChange }: Options) {
  const [draft, setDraft] = useState<NewsletterContact>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const setField = useCallback((field: keyof NewsletterContact, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    // Clearing on edit rather than on submit: the operator is already fixing
    // the thing the message complained about.
    setError(null);
  }, []);

  const add = useCallback(() => {
    const contact = normalizeContact(draft);
    const issue = contactIssue(contact);
    if (issue) {
      setError(issue);
      return false;
    }
    if (contacts.some((c) => c.email === contact.email)) {
      // Not silently ignored: the operator typed it for a reason, and the
      // reason is usually that they think it is missing.
      setError(`${contact.email} is already on the list.`);
      return false;
    }

    onChange([...contacts, contact]);
    setDraft(EMPTY);
    setError(null);
    return true;
  }, [draft, contacts, onChange]);

  const remove = useCallback(
    (email: string) => onChange(contacts.filter((c) => c.email !== email)),
    [contacts, onChange],
  );

  const clear = useCallback(() => {
    onChange([]);
    setDraft(EMPTY);
    setError(null);
  }, [onChange]);

  return {
    draft,
    setField,
    error,
    /** Enough typed to be worth submitting — drives the Add button. */
    canAdd: Boolean(draft.full_name.trim() && draft.email.trim()),
    add,
    remove,
    clear,
  };
}
