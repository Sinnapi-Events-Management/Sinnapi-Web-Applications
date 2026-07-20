import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserModel } from '@/lib/types';
import { toProfileUpdate, userRoleIds, type UserFormValues } from '../schema';

/**
 * Owns the edit drawer. The list row already carries every editable field
 * (names, phone, roles), so — unlike the vendor drawer — there's no second fetch;
 * the selected `UserModel` populates the form directly.
 *
 * Email and status are intentionally not written here: email is immutable, and
 * status is owned by the block/activate flow. Roles are reconciled as a diff so
 * only the actual add/remove happens against `user_roles`.
 */
export function useUserEdit() {
  const qc = useQueryClient();
  const [user, setUser] = useState<UserModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = useCallback((u: UserModel) => {
    setErr(null);
    setUser(u);
  }, []);

  const close = useCallback(() => {
    setUser(null);
    setErr(null);
  }, []);

  const save = useCallback(
    async (values: UserFormValues): Promise<boolean> => {
      if (!user) return false;
      setBusy(true);
      setErr(null);

      const { error: profErr } = await supabase
        .from('profiles')
        .update(toProfileUpdate(values))
        .eq('id', user.id);
      if (profErr) {
        setBusy(false);
        setErr(profErr.message);
        return false;
      }

      // Reconcile roles: only touch what actually changed.
      const current = new Set(userRoleIds(user));
      const next = new Set(values.roleIds);
      const toRemove = [...current].filter((id) => !next.has(id));
      const toAdd = [...next].filter((id) => !current.has(id));

      if (toRemove.length) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('profile_id', user.id)
          .in('role_id', toRemove);
        if (error) {
          setBusy(false);
          setErr(error.message);
          return false;
        }
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from('user_roles')
          .insert(toAdd.map((roleId) => ({ profile_id: user.id, role_id: roleId })));
        if (error) {
          setBusy(false);
          setErr(error.message);
          return false;
        }
      }

      setBusy(false);
      setUser(null);
      qc.invalidateQueries({ queryKey: ['users'] });
      // The edited user may be the signed-in admin — refresh their permissions.
      qc.invalidateQueries({ queryKey: ['admin-permissions'] });
      return true;
    },
    [user, qc],
  );

  return { user, isOpen: !!user, busy, err, open, close, save };
}
