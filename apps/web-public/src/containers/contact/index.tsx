import { Container } from '@sinnapi/ui';
import { PageHeader } from '@/components/molecules/sectionHeading';
import ContactForm from './organisms/contactForm';

/** Contact page container — page-level composition lives here, not in app/. */
export default function ContactContainer() {
  return (
    <>
      <PageHeader
        title="Contact us"
        subtitle="Questions, partnerships, or support — we'd love to hear from you."
      />
      <Container sx={{ py: 4, maxWidth: 640 }}>
        <ContactForm />
      </Container>
    </>
  );
}
