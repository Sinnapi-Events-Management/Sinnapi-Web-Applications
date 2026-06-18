import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type Ctx = {
  isAdmin: boolean;
  permissions: Set<string>;
  roles: string[];
  loading: boolean;
  has: (perm: string) => boolean;
};

const AdminContext = createContext<Ctx | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAdmin: false, permissions: new Set<string>(), roles: [] as string[] };
      // user_roles -> roles -> role_permissions -> permissions
      const { data: rows } = await supabase
        .from("user_roles")
        .select("roles(key,is_admin,role_permissions(permissions(key)))")
        .eq("profile_id", user.id);

      const permissions = new Set<string>();
      const roles: string[] = [];
      let isAdmin = false;
      for (const ur of (rows ?? []) as any[]) {
        const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
        if (!role) continue;
        roles.push(role.key);
        if (role.is_admin) isAdmin = true;
        for (const rp of role.role_permissions ?? []) {
          const perm = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
          if (perm?.key) permissions.add(perm.key);
        }
      }
      return { isAdmin, permissions, roles };
    },
  });

  const permissions = data?.permissions ?? new Set<string>();
  const value: Ctx = {
    isAdmin: data?.isAdmin ?? false,
    permissions,
    roles: data?.roles ?? [],
    loading: isLoading,
    has: (perm: string) => permissions.has(perm),
  };
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): Ctx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
