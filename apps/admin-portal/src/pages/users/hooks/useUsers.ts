import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers as useUsersQuery, useRoles } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { one } from '@/lib/rel';
import type { UserModel } from '@/lib/types';

export function useUsers() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const users = useUsersQuery(table.params);
  const roles = useRoles();
  const [active, setActive] = useState<UserModel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canManage = has('users.manage');

  function userRoleKeys(u: UserModel): Set<string> {
    const keys: string[] = [];
    for (const ur of u.user_roles ?? []) {
      const role = one(ur.roles);
      if (role?.key) keys.push(role.key);
    }
    return new Set(keys);
  }

  async function toggleRole(profileId: string, roleId: string, on: boolean) {
    setErr(null);
    const res = on
      ? await supabase.from('user_roles').insert({ profile_id: profileId, role_id: roleId })
      : await supabase
          .from('user_roles')
          .delete()
          .eq('profile_id', profileId)
          .eq('role_id', roleId);
    if (res.error) {
      setErr(res.error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['users'] });
  }

  const current = active ? userRoleKeys(active) : new Set<string>();

  return {
    roles,
    rows: users.data?.rows ?? [],
    total: users.data?.total ?? 0,
    isLoading: users.isLoading,
    isFetching: users.isFetching,
    error: users.error,
    canManage,
    active,
    setActive,
    err,
    userRoleKeys,
    toggleRole,
    current,
    table,
  };
}
