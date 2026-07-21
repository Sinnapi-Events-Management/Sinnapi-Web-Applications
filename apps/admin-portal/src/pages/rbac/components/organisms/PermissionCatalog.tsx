import { Stack } from '@sinnapi/ui';
import EmptyState from '@/components/ui/EmptyState';
import { getPermissionsEmptyState, type GrantFilter } from '../../schema';
import type { CategoryView } from '../../hooks/useRolePermissions';
import PermissionCategorySection from './PermissionCategorySection';

type Props = {
  categories: CategoryView[];
  granted: ReadonlySet<string>;
  locked: boolean;
  pending: ReadonlySet<string>;
  bulkBusy: boolean;
  forceExpanded: boolean;
  grantFilter: GrantFilter;
  isFiltered: boolean;
  onToggle: (permissionId: string, on: boolean) => void;
  onSetAll: (category: CategoryView, on: boolean) => void;
};

/**
 * The scrolling body of the permission pane: one section per category, or the
 * empty state that explains which filter emptied it.
 */
export default function PermissionCatalog({
  categories,
  granted,
  locked,
  pending,
  bulkBusy,
  forceExpanded,
  grantFilter,
  isFiltered,
  onToggle,
  onSetAll,
}: Props) {
  if (categories.length === 0) {
    const { title, description } = getPermissionsEmptyState(grantFilter, isFiltered);
    return <EmptyState title={title} description={description} />;
  }

  return (
    <Stack spacing={1.5}>
      {categories.map((category) => (
        <PermissionCategorySection
          key={category.category.key}
          category={category}
          granted={granted}
          locked={locked}
          pending={pending}
          bulkBusy={bulkBusy}
          forceExpanded={forceExpanded}
          onToggle={onToggle}
          onSetAll={onSetAll}
        />
      ))}
    </Stack>
  );
}
