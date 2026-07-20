import { Stack, Alert } from '@sinnapi/ui';
import EmptyState from '@/components/ui/EmptyState';
import FlagListItem from '../molecules/FlagListItem';
import FlagListItemSkeleton from '../molecules/FlagListItemSkeleton';
import type { FlagView, Selection } from '../../hooks/useMessagingModeration';
import type { FlagDetailState } from '../../hooks/useFlagDetail';

type Props = {
  rows: FlagView[];
  isLoading: boolean;
  error: unknown;
  selection: Selection;
  detail: FlagDetailState;
};

/**
 * The master column of the moderation workspace: owns the loading / error /
 * empty / list states and renders one <FlagListItem /> per flag. Selection and
 * the active flag are both driven from the page's hooks, so this stays a thin
 * presentational list.
 */
export default function FlagList({ rows, isLoading, error, selection, detail }: Props) {
  if (isLoading) {
    return (
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }).map((_, i) => (
          <FlagListItemSkeleton key={i} />
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

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No flagged messages"
        description="Nothing matches this view. Auto-detected and user-reported messages will appear here."
      />
    );
  }

  return (
    <Stack spacing={1.25}>
      {rows.map((flag) => (
        <FlagListItem
          key={flag.id}
          flag={flag}
          active={detail.isOpen(flag.id)}
          selected={selection.isSelected(flag.id)}
          onOpen={detail.open}
          onToggleSelect={selection.toggle}
        />
      ))}
    </Stack>
  );
}
