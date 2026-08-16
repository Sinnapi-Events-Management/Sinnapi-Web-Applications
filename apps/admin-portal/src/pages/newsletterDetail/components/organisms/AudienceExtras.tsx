import type { AudienceApi } from '../../hooks/useCampaignAudience';
import { useContactLibrary } from '../../hooks/useContactLibrary';
import type { ExtraRecipientSource } from '../../schema';
import ContactLibraryDialogs from '../molecules/ContactLibraryDialogs';
import ManualContactsSection from './ManualContactsSection';
import ImportContactsSection from './ImportContactsSection';
import SavedListSection from './SavedListSection';

type Props = {
  api: AudienceApi;
  /** Which of the three non-account sources the operator is looking at. */
  source: ExtraRecipientSource;
  disabled?: boolean;
};

/**
 * Recipients who are not account holders.
 *
 * Three ways in — a few people typed by hand, a spreadsheet uploaded now, and
 * an address book saved earlier — of which exactly one is on screen. This
 * component owns only what genuinely spans them: the address-book library,
 * whose save dialog any section can open with its own contacts and whose
 * delete confirmation the book picker raises.
 *
 * Nothing here holds recipient state. It lives in `useExtraRecipients`, reached
 * through `api.extras`, so the numbers on this screen and the payload sent to
 * `admin_newsletter_queue` are the same values rather than two views that have
 * to be kept in step — and so switching sources cannot quietly drop a list that
 * is still going to be mailed.
 */
export default function AudienceExtras({ api, source, disabled }: Props) {
  const extras = api.extras;
  const library = useContactLibrary();

  return (
    <>
      {source === 'manual' && (
        <ManualContactsSection
          api={extras.manual}
          contacts={extras.typedContacts}
          disabled={disabled}
          onSaveToBook={library.openSaveDialog}
        />
      )}

      {source === 'import' && (
        <ImportContactsSection
          api={extras.imported}
          disabled={disabled}
          onSaveToBook={library.openSaveDialog}
        />
      )}

      {source === 'saved' && (
        <SavedListSection
          api={extras.listSelection}
          lists={library.lists}
          listsLoading={library.isLoading}
          disabled={disabled}
          onDelete={library.askDelete}
        />
      )}

      <ContactLibraryDialogs
        library={library}
        onDeleted={(removed) => {
          // The picker is still pointing at a book that no longer exists.
          if (extras.listSelection.list?.id === removed.id) {
            extras.listSelection.chooseList(null);
          }
        }}
      />
    </>
  );
}
