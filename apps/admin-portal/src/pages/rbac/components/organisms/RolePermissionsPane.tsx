import { Box, Stack, Typography, Alert, Divider } from '@sinnapi/ui';
import TuneIcon from '@mui/icons-material/Tune';
import type { RoleModel } from '@/lib/types';
import type { RolePermissionsState } from '../../hooks/useRolePermissions';
import RolePaneHeader from '../molecules/RolePaneHeader';
import PermissionsToolbar from './PermissionsToolbar';
import PermissionCatalog from './PermissionCatalog';

type Props = {
  role: RoleModel | undefined;
  editor: RolePermissionsState;
  onCopy: () => void;
  onClose: () => void;
};

/** Resting state on desktop, where the pane is always mounted beside the roles. */
function Placeholder() {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 6 }}>
      <TuneIcon sx={{ fontSize: 44, color: 'grey.400' }} />
      <Typography variant="h6" color="text.primary">
        Select a role
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 320, textAlign: 'center' }}
      >
        Choose a role from the list to review and configure the permissions it grants.
      </Typography>
    </Stack>
  );
}

/**
 * The detail column: the open role's identity, the filters over the catalog, and
 * the grouped permission switches.
 *
 * Only the catalog scrolls — the header, banners and toolbar stay pinned, so the
 * role being edited and any error stay visible however far down the admin is.
 */
export default function RolePermissionsPane({ role, editor, onCopy, onClose }: Props) {
  if (!role) return <Placeholder />;

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }}>
      <RolePaneHeader
        role={role}
        granted={editor.totalGranted}
        total={editor.totalPermissions}
        locked={editor.locked}
        busy={editor.bulkBusy}
        onCopy={onCopy}
        onClose={onClose}
      />

      <Divider sx={{ my: 2 }} />

      <Stack spacing={1.5}>
        {editor.locked && (
          <Alert severity="info">
            <strong>{role.name}</strong> is an admin role, so its permissions are read-only here.
            Switches show what it currently grants.
          </Alert>
        )}
        {editor.error && (
          <Alert severity="error" onClose={editor.dismissError}>
            {editor.error}
          </Alert>
        )}
        <PermissionsToolbar
          search={editor.search}
          grantFilter={editor.grantFilter}
          onGrantFilterChange={editor.setGrantFilter}
          visibleCount={editor.visibleCount}
          isFiltered={editor.isFiltered}
          onClearFilters={editor.clearFilters}
        />
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 2, pr: 0.5 }}>
        <PermissionCatalog
          categories={editor.categories}
          granted={editor.granted}
          locked={editor.locked}
          pending={editor.pending}
          bulkBusy={editor.bulkBusy}
          forceExpanded={editor.forceExpanded}
          grantFilter={editor.grantFilter}
          isFiltered={editor.isFiltered}
          onToggle={editor.toggle}
          onSetAll={editor.setCategoryGrants}
        />
      </Box>
    </Stack>
  );
}
