import { Alert, Box, Button, SearchField, SectionCard, Stack, Typography } from '@sinnapi/ui';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { ContactListModel } from '@/lib/types';
import type { ContactListSelectionApi } from '../../hooks/useContactListSelection';
import ContactListSelectField from '../molecules/ContactListSelectField';
import ContactListTable from '../molecules/ContactListTable';

type Props = {
  api: ContactListSelectionApi;
  lists: ContactListModel[];
  listsLoading: boolean;
  disabled?: boolean;
  onDelete: (list: ContactListModel) => void;
};

/**
 * Sending to people who were saved earlier.
 *
 * This is the whole point of address books: the second campaign to the same
 * people is a title picked from a dropdown, not a hunt for a spreadsheet. Pick
 * the book, then narrow it — everyone in it by default, a search to cut it to a
 * segment, individual ticks to trim the rest.
 */
export default function SavedListSection({ api, lists, listsLoading, disabled, onDelete }: Props) {
  const selected = api.list;

  return (
    <SectionCard
      title="Send to a saved address book"
      icon={<ContactMailIcon />}
      subtitle="Lists you saved from an earlier import or entry."
      action={
        selected ? (
          <Button
            size="small"
            variant="text"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => onDelete(selected)}
          >
            Delete book
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <ContactListSelectField
          lists={lists}
          loading={listsLoading}
          selectedId={api.list?.id ?? null}
          disabled={disabled}
          onSelect={api.chooseList}
        />

        {api.list && (
          <>
            {api.list.description && (
              <Typography variant="body2" color="text.secondary">
                {api.list.description}
              </Typography>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
            >
              <Box sx={{ flex: 1 }}>
                <SearchField
                  value={api.searchInput}
                  onChange={api.onSearchChange}
                  onClear={() => api.onSearchChange('')}
                  placeholder="Search this address book…"
                  ariaLabel="Search the address book"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {api.selectedCount.toLocaleString()} selected
              </Typography>
            </Stack>

            {api.selectAll && (
              <Alert severity="info">
                Everyone in <strong>{api.list.title}</strong>
                {api.searchInput ? ' who matches your search' : ''} is selected —{' '}
                <strong>{api.selectedCount.toLocaleString()} contacts</strong>, not just the rows on
                this page. Untick anyone you want to leave out, or untick the header box to start
                from an empty selection.
              </Alert>
            )}

            {api.error && <Alert severity="error">{api.error}</Alert>}

            <ContactListTable api={api} disabled={disabled} />
          </>
        )}
      </Stack>
    </SectionCard>
  );
}
