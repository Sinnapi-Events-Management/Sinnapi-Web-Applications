import { Button, SectionCard, Stack, Typography } from '@sinnapi/ui';
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import type { NewsletterContact } from '@/lib/types';
import type { ManualContactsApi } from '../../hooks/useManualContacts';
import ContactEntryForm from '../molecules/ContactEntryForm';
import ContactChipList from '../molecules/ContactChipList';

type Props = {
  api: ManualContactsApi;
  contacts: NewsletterContact[];
  disabled?: boolean;
  onSaveToBook: (contacts: NewsletterContact[]) => void;
};

/**
 * Adding people one at a time.
 *
 * Structure only: the draft row, its validation and the committed list all
 * arrive through `api`, which `useExtraRecipients` owns. That is what lets this
 * section unmount when the operator looks at another source without losing a
 * half-typed name.
 */
export default function ManualContactsSection({ api, contacts, disabled, onSaveToBook }: Props) {
  return (
    <SectionCard
      title="Add people by hand"
      icon={<PersonAddAlt1Icon />}
      subtitle="For people who do not have a Sinnapi account."
      action={
        contacts.length > 0 ? (
          <Button
            size="small"
            variant="text"
            startIcon={<BookmarkAddIcon />}
            disabled={disabled}
            onClick={() => onSaveToBook(contacts)}
          >
            Save to address book
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          A name is required alongside the address — it is stored against the send, and it is what
          makes a saved address book readable a year from now.
        </Typography>

        <ContactEntryForm
          draft={api.draft}
          error={api.error}
          disabled={disabled}
          onField={api.setField}
          onAdd={api.add}
        />

        <ContactChipList
          contacts={contacts}
          disabled={disabled}
          emptyHint="Nobody added by hand yet."
          onRemove={api.remove}
          onClear={api.clear}
        />
      </Stack>
    </SectionCard>
  );
}
