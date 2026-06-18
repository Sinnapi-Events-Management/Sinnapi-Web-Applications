import type { Metadata } from "next";
import { Container, Accordion, AccordionSummary, AccordionDetails, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { PageHeader } from "@/components/common/SectionHeading";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about using Sinnapi.",
  alternates: { canonical: "/faq" },
};

const FAQS = [
  ["Is it free to browse vendors?", "Yes. Anyone can browse and search verified vendors. You'll need to sign in to chat, request quotes, or book."],
  ["How does Sinnapi Escrow work?", "You can pay a vendor directly or use Sinnapi Escrow. With escrow, you pay Sinnapi, funds are held safely, and released to the vendor after you confirm and our team approves."],
  ["How are vendors verified?", "Every vendor completes an application, due diligence, and signs an MOU before being approved and listed publicly."],
  ["Why can't I see a vendor's phone or email?", "To keep transactions safe and on-platform, vendor contacts are hidden. Sign in to message vendors directly."],
  ["What does it cost to become a vendor?", "Approved vendors get a 30-day free trial, then choose a Starter, Professional, or Elite subscription."],
];

export default function FaqPage() {
  return (
    <>
      <PageHeader title="Frequently asked questions" />
      <Container sx={{ py: 4, maxWidth: 820 }}>
        {FAQS.map(([q, a]) => (
          <Accordion key={q} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>{q}</Typography></AccordionSummary>
            <AccordionDetails><Typography color="text.secondary">{a}</Typography></AccordionDetails>
          </Accordion>
        ))}
      </Container>
    </>
  );
}
