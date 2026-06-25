import type { Metadata } from 'next';
import { Container } from '@sinnapi/ui';
import { PageHeader } from '@/components/common/SectionHeading';
import ContactForm from '@/components/contact/contactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Sinnapi team.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
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
