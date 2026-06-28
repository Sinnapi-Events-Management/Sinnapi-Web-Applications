import {
  Box,
  Container,
  Grid,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@sinnapi/ui';
import { ExpandMore, VerifiedUser, Handshake, Lock } from '@sinnapi/ui/icons';
import { mutedSurface } from '@/lib/sx';
import { FAQS } from './data/faqs';

export default function FaqSection() {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={5}>
          <Grid item xs={12} md={4}>
            <Typography variant="overline" color="primary">
              Questions
            </Typography>
            <Typography variant="h2" sx={{ mt: 0.5 }}>
              Frequently asked
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Everything you need to know about booking and selling on Sinnapi.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 3, color: 'text.secondary' }}>
              <VerifiedUser color="primary" />
              <Handshake color="primary" />
              <Lock color="primary" />
            </Stack>
          </Grid>
          <Grid item xs={12} md={8}>
            {FAQS.map(({ question, answer }) => (
              <Accordion
                key={question}
                disableGutters
                sx={{ bgcolor: 'transparent', boxShadow: 'none' }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    {answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
