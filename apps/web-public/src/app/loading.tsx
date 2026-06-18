import { Container, Grid, Skeleton, Box } from "@mui/material";

export default function Loading() {
  return (
    <Container sx={{ py: 6 }}>
      <Skeleton variant="text" width={320} height={48} />
      <Skeleton variant="text" width={480} height={28} sx={{ mb: 4 }} />
      <Grid container spacing={3}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
            <Box>
              <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 1 }} />
              <Skeleton variant="text" sx={{ mt: 1 }} />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
