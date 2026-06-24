import { Container, Grid, Paper, Typography } from '@sinnapi/ui';
import SectionHeading from '@/components/common/SectionHeading';
import { VALUE_PROPS } from './data/valueProps';

export default function ValueProps() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Why Sinnapi"
        title="Plan with total confidence"
        subtitle="Everything you need to find, vet, and book the right vendors — safely."
      />
      <Grid container spacing={3}>
        {VALUE_PROPS.map(({ Icon, title, body }) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                height: '100%',
                transition: 'box-shadow .2s, transform .2s',
                '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
              }}
            >
              <Icon color="primary" />
              <Typography variant="h6" sx={{ mt: 1.5 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {body}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
