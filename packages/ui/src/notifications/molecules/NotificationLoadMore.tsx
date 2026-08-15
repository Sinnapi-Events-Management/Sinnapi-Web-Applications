'use client';
import { Stack, Button, Typography, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { NotificationPaging } from '../types';

export type NotificationLoadMoreProps = {
  paging: NotificationPaging;
};

/**
 * "Load more", plus the honest "showing X of Y" a paged feed owes its reader.
 *
 * The count is stated even when everything is loaded, because filtering happens
 * over the loaded pages: without it, a search that matches nothing looks like an
 * empty feed rather than an unfetched one.
 */
export function NotificationLoadMore({ paging }: NotificationLoadMoreProps) {
  if (paging.total === 0) return null;

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
