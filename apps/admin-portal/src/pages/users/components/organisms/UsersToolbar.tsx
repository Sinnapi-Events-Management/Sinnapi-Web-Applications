import { Box, Button, Stack } from '@sinnapi/ui';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SearchField from '@/components/ui/SearchField';
import type { SearchTerm } from '@/hooks/useSearchTerm';

type Props = {
  search: SearchTerm;
  /** Whether the current admin may provision users. */
  canManage: boolean;
  onCreate: () => void;
};

/**
 * Search + primary "New user" action for the Users list. Presentational: it
 * renders the controls and delegates to the hooks the page already owns.
 * Collapses to a single column on narrow screens.
 */
export default function UsersToolbar({ search, canManage, onCreate }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { sm: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by name or email…"
          ariaLabel="Search users"
        />
      </Box>

      {canManage && (
        <Button
          variant="contained"
          startIcon={<PersonAddAlt1Icon />}
          onClick={onCreate}
          sx={{ whiteSpace: 'nowrap' }}
        >
          New user
        </Button>
      )}
    </Stack>
  );
}
