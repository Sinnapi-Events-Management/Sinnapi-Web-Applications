import { Grid, Paper, TextField, Button, Box } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import EmptyState from '@/components/ui/EmptyState';
import QueryState from '@/components/ui/QueryState';
import VendorCard from '@/components/vendor/VendorCard';
import { useDiscover } from './hooks/useDiscover';

export default function Discover() {
  const { q, setQ, search, vendors } = useDiscover();

  return (
    <>
      <PageTitle
        title="Discover vendors"
        subtitle="Search verified providers, then request a quote or book."
      />
      <Paper
        variant="outlined"
        component="form"
        onSubmit={search}
        sx={{ p: 2, mb: 3, display: 'flex', gap: 2 }}
      >
        <TextField value={q} onChange={(e) => setQ(e.target.value)} label="Search vendors" />
        <Box>
          <Button type="submit" variant="contained" sx={{ height: 40 }}>
            Search
          </Button>
        </Box>
      </Paper>
      <QueryState isLoading={vendors.isLoading} error={vendors.error}>
        {(vendors.data ?? []).length === 0 ? (
          <EmptyState title="No vendors found" description="Try a different search term." />
        ) : (
          <Grid container spacing={3}>
            {(vendors.data ?? []).map((v) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={v.id}>
                <VendorCard vendor={v} />
              </Grid>
            ))}
          </Grid>
        )}
      </QueryState>
    </>
  );
}
