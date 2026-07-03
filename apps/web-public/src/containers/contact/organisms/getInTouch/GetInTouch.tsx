import { Box, Container, Grid, Paper, Typography } from '@sinnapi/ui/atoms';
import { mutedSurface, scrollAnchor } from '@/lib/sx';
import ContactForm from '../contactForm';
import ContactInfoPanel from './molecules/ContactInfoPanel';

/**
 * The core "get in touch" section: a two-column split with the direct-contact
 * panel on the left and the message form, raised in a card, on the right. The
 * `#message` anchor lets the hero / method cards deep-link straight to the form.
 */
export default function GetInTouch() {
  return (
    <Box
      id="message"
      sx={{ ...mutedSurface, ...scrollAnchor, borderTop: 1, borderColor: 'divider' }}
    >
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="flex-start">
          <Grid item xs={12} md={5}>
            <ContactInfoPanel />
          </Grid>
          <Grid item xs={12} md={7}>
            <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, bgcolor: 'background.paper' }}>
              <Typography variant="h5">Send us a message</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                Fill in the form and we&apos;ll route your enquiry to the right team.
              </Typography>
              <ContactForm />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
