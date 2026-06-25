import NextLink from 'next/link';
import { Box, Container, Grid, Stack, Typography, Button, Avatar } from '@sinnapi/ui';
import { ArrowForward } from '@sinnapi/ui/icons';
import SectionHeading from '@/components/common/SectionHeading';
import { mutedSurface } from '@/lib/sx';
import { COLUMNS } from './data/columns';

export default function HowItWorks() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <SectionHeading
          align="center"
          overline="How it works"
          title="Simple, safe, built on trust"
          subtitle="Whether you're planning an event or growing your business, getting started takes minutes."
        />
        <Grid container spacing={5}>
          {COLUMNS.map((col) => (
            <Grid item xs={12} md={6} key={col.who}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                {col.who}
              </Typography>
              <Stack spacing={2}>
                {col.steps.map(({ title, body }, i) => (
                  <Stack key={title} direction="row" spacing={2} alignItems="flex-start">
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 36,
                        height: 36,
                        fontSize: '0.95rem',
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {body}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ textAlign: 'center', mt: 5 }}>
          <Button
            component={NextLink}
            href="/how-it-works"
            variant="text"
            endIcon={<ArrowForward />}
          >
            Learn more about how Sinnapi works
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
