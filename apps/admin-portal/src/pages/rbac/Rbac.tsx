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
import { titleize } from '@/lib/config';
import { useRbac } from './hooks/useRbac';

export default function Rbac() {
  const { roles, perms, roleId, setRoleId, err, role, rolePermIds, grouped, toggle } = useRbac();

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
