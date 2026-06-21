import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUsers as useUsersQuery, useRoles } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { one } from '@/lib/rel';
import type { UserModel } from '@/lib/types';

export function useUsers() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const users = useUsersQuery();
  const roles = useRoles();
  const [active, setActive] = useState<UserModel | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canManage = has('users.manage');
  const rows = users.data ?? [];

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
    users,
    roles,
    rows,
    canManage,
    active,
    setActive,
    err,
    userRoleKeys,
    toggleRole,
    current,
  };
}
