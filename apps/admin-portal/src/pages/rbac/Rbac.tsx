import PageTitle from '@/components/ui/PageTitle';
import { useRbac } from './hooks/useRbac';
import { useRolePermissions } from './hooks/useRolePermissions';
import { useCopyPermissions } from './hooks/useCopyPermissions';
import RbacSummary from './components/organisms/RbacSummary';
import RbacWorkspace from './components/organisms/RbacWorkspace';
import RolesPanel from './components/organisms/RolesPanel';
import RolePermissionsPane from './components/organisms/RolePermissionsPane';
import CopyPermissionsDialog from './components/organisms/CopyPermissionsDialog';

/**
 * Roles & permissions — a master–detail editor over the `role_permissions`
 * mapping. Composition only: the catalogs and selection live in `useRbac`, the
 * grant editing in `useRolePermissions`, and the copy flow in
 * `useCopyPermissions`.
 */
export default function Rbac() {
  const rbac = useRbac();
  const editor = useRolePermissions(rbac.selectedRole, rbac.permissions);
  const copy = useCopyPermissions({
    target: rbac.selectedRole,
    roles: rbac.roles,
    granted: editor.granted,
    catalog: rbac.permissions,
    replaceGrants: editor.replaceGrants,
    locked: editor.locked,
  });

  return (
    <>
      <PageTitle
        title="Roles & permissions"
        subtitle="Configure what each role can do. Changes apply immediately (Super Admin)."
      />

      <RbacSummary
        counts={rbac.counts}
        loading={rbac.isLoading}
        selectedRoleName={rbac.selectedRole?.name}
      />

      <RbacWorkspace
        detailOpen={!!rbac.selectedRole}
        onCloseDetail={rbac.clearSelection}
        master={
          <RolesPanel
            roles={rbac.visibleRoles}
            totalPermissions={rbac.permissions.length}
            isLoading={rbac.isLoading}
            error={rbac.error}
            isFiltered={rbac.isFiltered}
            search={rbac.roleSearch}
            isSelected={rbac.isSelected}
            onSelect={rbac.selectRole}
          />
        }
        detail={
          <RolePermissionsPane
            role={rbac.selectedRole}
            editor={editor}
            onCopy={copy.start}
            onClose={rbac.clearSelection}
          />
        }
      />

      <CopyPermissionsDialog copy={copy} target={rbac.selectedRole} />
    </>
  );
}
