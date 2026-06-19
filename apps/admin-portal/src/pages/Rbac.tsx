import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Chip,
} from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import { useRoles, usePermissionsCatalog } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { titleize } from '@/lib/config';
import type { PermissionModel } from '@/lib/types';

export default function Rbac() {
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

  return (
    <>
      <PageTitle
        title="Roles & permissions"
        subtitle="Configure what each role can do. Changes apply immediately (Super Admin)."
      />
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <QueryState isLoading={roles.isLoading || perms.isLoading} error={roles.error ?? perms.error}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <List>
                {(roles.data ?? []).map((r) => (
                  <ListItemButton
                    key={r.id}
                    selected={r.id === roleId}
                    onClick={() => setRoleId(r.id)}
                  >
                    <ListItemText primary={r.name} secondary={r.key} />
                    {r.is_admin && <Chip size="small" label="admin" color="primary" />}
                  </ListItemButton>
                ))}
              </List>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card variant="outlined">
              <CardContent>
                {!role ? (
                  <Typography color="text.secondary">
                    Select a role to edit its permissions.
                  </Typography>
                ) : (
                  <>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {role.name}
                    </Typography>
                    {Object.entries(grouped).map(([cat, list]) => (
                      <Box key={cat} sx={{ mb: 2 }}>
                        <Typography variant="overline" color="text.secondary">
                          {titleize(cat)}
                        </Typography>
                        {list.map((p) => (
                          <FormControlLabel
                            key={p.id}
                            sx={{ display: 'flex' }}
                            control={
                              <Switch
                                checked={rolePermIds.has(p.id)}
                                onChange={(_, on) => toggle(p.id, on)}
                              />
                            }
                            label={
                              <span>
                                <strong>{p.key}</strong>
                                {p.description ? ` — ${p.description}` : ''}
                              </span>
                            }
                          />
                        ))}
                      </Box>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </QueryState>
    </>
  );
}
