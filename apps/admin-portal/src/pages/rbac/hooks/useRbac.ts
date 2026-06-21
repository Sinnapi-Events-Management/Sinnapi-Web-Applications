import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRoles, usePermissionsCatalog } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import type { PermissionModel } from '@/lib/types';

export function useRbac() {
  const qc = useQueryClient();
  const roles = useRoles();
  const perms = usePermissionsCatalog();
  const [roleId, setRoleId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const role = (roles.data ?? []).find((r) => r.id === roleId);
  const rolePermIds = new Set<string>((role?.role_permissions ?? []).map((rp) => rp.permission_id));

  async function toggle(permId: string, on: boolean) {
    if (!roleId) return;
    setErr(null);
    const res = on
      ? await supabase.from('role_permissions').insert({ role_id: roleId, permission_id: permId })
      : await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('permission_id', permId);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['roles'] });
  }

  // group permissions by category
  const grouped: Record<string, PermissionModel[]> = {};
  for (const p of perms.data ?? []) {
    (grouped[p.category ?? 'other'] ??= []).push(p);
  }

  return {
    roles,
    perms,
    roleId,
    setRoleId,
    err,
    role,
    rolePermIds,
    grouped,
    toggle,
  };
}
