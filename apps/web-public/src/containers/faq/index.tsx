import { Container, Typography } from '@sinnapi/ui/atoms';
import { Accordion, AccordionSummary, AccordionDetails } from '@sinnapi/ui/molecules';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { PageHeader } from '@/components/molecules/sectionHeading';

const FAQS = [
  [
    'Is it free to browse vendors?',
    "Yes. Anyone can browse and search verified vendors. You'll need to sign in to chat, request quotes, or book.",
  ],
  [
    'How does Sinnapi Escrow work?',
    'You can pay a vendor directly or use Sinnapi Escrow. With escrow, you pay Sinnapi, funds are held safely, and released to the vendor after you confirm and our team approves.',
  ],
  [
    'How are vendors verified?',
    'Every vendor completes an application, due diligence, and signs an MOU before being approved and listed publicly.',
  ],
  [
    "Why can't I see a vendor's phone or email?",
    'To keep transactions safe and on-platform, vendor contacts are hidden. Sign in to message vendors directly.',
  ],
  [
    'What does it cost to become a vendor?',
    'Approved vendors get a 30-day free trial, then choose a Starter, Professional, or Elite subscription.',
  ],
];

// FAQ page: renders frequently asked questions as an accordion list.
export default function FaqContainer() {
  return (
    <>
      <PageHeader title="Frequently asked questions" />
      <Container sx={{ py: 4, maxWidth: 820 }}>
        {FAQS.map(([q, a]) => (
          <Accordion key={q} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>{q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </>
  );
}
