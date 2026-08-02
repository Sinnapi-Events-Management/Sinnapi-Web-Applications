import { Alert, Box, Divider, Drawer, IconButton, Stack, Typography } from '@sinnapi/ui';
import CloseIcon from '@mui/icons-material/Close';
import type { ServiceCategoryModel } from '@/lib/types';
import type { CategoryFormValues } from '../../schema';
import type { CategoryDrawerMode } from '../../hooks/useCategoryEdit';
import CategoryForm from '../molecules/CategoryForm';
import type { SelectOption } from '../molecules/ControlledField';

type Props = {
  open: boolean;
  mode: CategoryDrawerMode;
  /** The category being edited; null in create mode. */
  category: ServiceCategoryModel | null;
  parentOptions: SelectOption[];
  /** Suggested sort order for a new category — one past the current highest. */
  nextSortOrder: number;
  busy: boolean;
  /** Save failure, surfaced above the fields so it survives a scroll. */
  err: string | null;
  onClose: () => void;
  onSave: (values: CategoryFormValues) => Promise<boolean>;
};

/**
 * Right-hand drawer for creating or editing a category. Owns the shell; the
 * form and the write live below it.
 *
 * `keepMounted={false}` (MUI's default) matters: unmounting on close discards
 * react-hook-form's state, so the next open — a different category, or a
 * fresh create — starts clean rather than inheriting the last one's edits.
 */
export default function CategoryDrawer({
  open,
  mode,
  category,
  parentOptions,
  nextSortOrder,
  busy,
  err,
  onClose,
  onSave,
}: Props) {
  const isCreate = mode === 'create';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 480 },
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, py: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {isCreate ? 'New category' : 'Edit category'}
          </Typography>
          {!isCreate && category?.name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {category.name}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} disabled={busy} aria-label="Close category drawer" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />

      {err && (
        <Alert severity="error" sx={{ mx: 3, mt: 2 }}>
          {err}
        </Alert>
      )}

      <CategoryForm
        category={category}
        isCreate={isCreate}
        parentOptions={parentOptions}
        nextSortOrder={nextSortOrder}
        busy={busy}
        onCancel={onClose}
        onSave={onSave}
      />
    </Drawer>
  );
}
