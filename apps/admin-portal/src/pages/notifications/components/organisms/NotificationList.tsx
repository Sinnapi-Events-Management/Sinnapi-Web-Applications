import { Stack, Box, Alert, Button, Typography, CircularProgress } from '@sinnapi/ui';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmptyState from '@/components/ui/EmptyState';
import NotificationListItem from '../molecules/NotificationListItem';
import NotificationListItemSkeleton from '../molecules/NotificationListItemSkeleton';
import DayGroupHeader from '../molecules/DayGroupHeader';
import { getEmptyState, type DayGroup, type NotificationTab } from '../../schema';
import type { NotificationView, PagingState } from '../../hooks/useNotifications';
import type { ActiveNotificationState } from '../../hooks/useActiveNotification';

type Props = {
  groups: DayGroup<NotificationView>[];
  isLoading: boolean;
  error: unknown;
  tab: NotificationTab;
  /** True when filters emptied the list, rather than the feed being empty. */
  isFiltered: boolean;
  paging: PagingState;
  active: ActiveNotificationState;
};

/**
 * The master column: loading / error / empty / grouped-list states for the feed,
 * plus the Load more control. Thin and presentational — the open row and every
 * filter live in the page's hooks.
 */
export default function NotificationList({
  groups,
  isLoading,
  error,
  tab,
  isFiltered,
  paging,
  active,
}: Props) {
  if (isLoading) {
    return (
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }).map((_, i) => (
          <NotificationListItemSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Something went wrong.'}
      </Alert>
    );
  }

  if (groups.length === 0) {
    const { title, description } = getEmptyState(tab, isFiltered);
    // Offer Load more even on an empty view: under a filter the matches may
    // simply live in pages that haven't been fetched yet.
    return (
      <Stack spacing={2}>
        <EmptyState title={title} description={description} />
        {paging.hasMore && <LoadMore paging={paging} />}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25}>
      {groups.map((group) => (
        <Box key={group.key}>
          <DayGroupHeader label={group.label} count={group.items.length} />
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            {group.items.map((n) => (
              <NotificationListItem
                key={n.id}
                notification={n}
                active={active.isOpen(n.id)}
                onOpen={active.open}
              />
            ))}
          </Stack>
        </Box>
      ))}
      <LoadMore paging={paging} />
    </Stack>
  );
}

/** Load more plus the honest "showing X of Y" the paged feed owes the admin. */
function LoadMore({ paging }: { paging: PagingState }) {
  return (
    <Stack alignItems="center" spacing={0.75} sx={{ pt: 0.5, pb: 1 }}>
      {paging.hasMore && (
        <Button
          onClick={paging.loadMore}
          disabled={paging.loadingMore}
          variant="outlined"
          size="small"
          startIcon={paging.loadingMore ? <CircularProgress size={14} /> : <ExpandMoreIcon />}
        >
          {paging.loadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
      <Typography variant="caption" color="text.disabled">
        {paging.hasMore
          ? `Showing ${paging.loaded} of ${paging.total}`
          : `All ${paging.total} loaded`}
      </Typography>
    </Stack>
  );
}
