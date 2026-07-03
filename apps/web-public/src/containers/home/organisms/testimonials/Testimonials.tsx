import { Box, Container, Grid, Stack, Typography, Paper, Avatar, Rating } from '@sinnapi/ui/atoms';
import { FormatQuote } from '@mui/icons-material';
import SectionHeading from '@/components/molecules/sectionHeading';
import { mutedSurface } from '@/lib/sx';
import { TESTIMONIALS } from './data/testimonials';

export default function Testimonials() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="Loved by clients & vendors"
          title="Trusted across the events community"
        />
        <Grid container spacing={3}>
          {TESTIMONIALS.map((t) => (
            <Grid item xs={12} md={4} key={t.name}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  height: '100%',
                  transition: 'box-shadow .2s, transform .2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
                }}
              >
                <FormatQuote sx={{ color: 'secondary.main', fontSize: 36 }} />
                <Typography variant="body1" sx={{ mt: 1, mb: 3 }}>
                  {t.quote}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main' }}>{t.name.charAt(0)}</Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {t.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.role}
                    </Typography>
                  </Box>
                </Stack>
                <Rating value={t.rating} readOnly size="small" sx={{ mt: 1.5 }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
