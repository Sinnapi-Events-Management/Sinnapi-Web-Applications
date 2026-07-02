import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@sinnapi/ui';
import { ExpandMore } from '@sinnapi/ui/icons';
import SectionHeading from '@/components/molecules/sectionHeading';
import { VENDOR_FAQS } from './data/faqs';

/**
 * Vendor FAQ — progressive disclosure of the questions that would otherwise stall
 * an application. Built on the shared Accordion molecule; each panel is
 * uncontrolled so this stays a lightweight, mostly-static section.
 */
export default function VendorFaq() {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        align="center"
        overline="Questions & answers"
        title="Everything you need to know before applying"
      />
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        {VENDOR_FAQS.map(({ question, answer }) => (
          <Accordion
            key={question}
            disableGutters
            elevation={0}
            square
            sx={{
              bgcolor: 'transparent',
              borderBottom: 1,
              borderColor: 'divider',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{ px: 0, py: 1, '& .MuiAccordionSummary-content': { my: 1.5 } }}
            >
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>
                {question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pb: 2.5, pt: 0 }}>
              <Typography variant="body1" color="text.secondary">
                {answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
}
