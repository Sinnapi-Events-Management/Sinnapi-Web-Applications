import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { one } from '@/lib/rel';
import type { AdminUserRoleRow } from '@/lib/types';

type Ctx = {
  isAdmin: boolean;
  permissions: Set<string>;
  roles: string[];
  loading: boolean;
  has: (perm: string) => boolean;
  /**
   * The signed-in admin's profile id. Needed wherever a maker-checker control
   * has to tell "someone else did this" from "you did this" — the RPC is the
   * one that enforces it, but the UI should not offer a button that will be
   * refused.
   */
  profileId: string | null;
};

const AdminContext = createContext<Ctx | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return {
          isAdmin: false,
          permissions: new Set<string>(),
          roles: [] as string[],
          profileId: null as string | null,
        };
      }
      // user_roles -> roles -> role_permissions -> permissions
      const { data: rows } = await supabase
        .from('user_roles')
        .select('roles(key,is_admin,role_permissions(permissions(key)))')
        .eq('profile_id', user.id);

      const permissions = new Set<string>();
      const roles: string[] = [];
      let isAdmin = false;
      for (const ur of (rows ?? []) as AdminUserRoleRow[]) {
        const role = one(ur.roles);
        if (!role) continue;
        roles.push(role.key);
        if (role.is_admin) isAdmin = true;
        for (const rp of role.role_permissions ?? []) {
          const perm = one(rp.permissions);
          if (perm?.key) permissions.add(perm.key);
        }
      }
      return { isAdmin, permissions, roles, profileId: user.id as string | null };
    },
  });

  const permissions = data?.permissions ?? new Set<string>();
  const value: Ctx = {
    isAdmin: data?.isAdmin ?? false,
    permissions,
    roles: data?.roles ?? [],
    loading: isLoading,
    has: (perm: string) => permissions.has(perm),
    profileId: data?.profileId ?? null,
  };
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): Ctx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
