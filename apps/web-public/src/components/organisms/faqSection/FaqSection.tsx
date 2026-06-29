import type { ReactNode } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@sinnapi/ui';
import { ExpandMore } from '@sinnapi/ui/icons';
import { mutedSurface } from '@/lib/sx';

export type Faq = { question: string; answer: string };

type FaqSectionProps = {
  /** Small primary-coloured kicker above the title. */
  overline: string;
  /** Section title (rendered as h2). */
  title: string;
  /** Supporting copy under the title — plain text or rich nodes (e.g. links). */
  subtitle?: ReactNode;
  /** Optional extra under the heading, e.g. a trust-icon row. */
  aside?: ReactNode;
  /** The questions to render as an accordion list. */
  faqs: Faq[];
};

/**
 * Shared FAQ section — a two-column band with the heading on the left and an
 * accordion list on the right. Single source of truth for FAQ presentation so
 * every page (home, contact, …) stays visually consistent; callers supply only
 * the copy and the questions.
 */
export default function FaqSection({ overline, title, subtitle, aside, faqs }: FaqSectionProps) {
  return (
    <Box sx={{ ...mutedSurface, borderTop: 1, borderColor: 'divider' }}>
      <Container sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={5}>
          <Grid item xs={12} md={4}>
            <Typography variant="overline" color="primary">
              {overline}
            </Typography>
            <Typography variant="h2" sx={{ mt: 0.5 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography component="div" color="text.secondary" sx={{ mt: 2 }}>
                {subtitle}
              </Typography>
            )}
            {aside}
          </Grid>
          <Grid item xs={12} md={8}>
            {faqs.map(({ question, answer }) => (
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
