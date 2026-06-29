import { Stack } from '@sinnapi/ui';
import { VerifiedUser, Handshake, Lock } from '@sinnapi/ui/icons';
import SharedFaqSection, { FAQS } from '@/components/organisms/faqSection';

/**
 * Home FAQ — wires the home copy + questions into the shared FaqSection so the
 * presentation stays consistent with the contact page.
 */
export default function FaqSection() {
  return (
    <SharedFaqSection
      overline="Questions"
      title="Frequently asked"
      subtitle="Everything you need to know about booking and selling on Sinnapi."
      aside={
        <Stack direction="row" spacing={2} sx={{ mt: 3, color: 'text.secondary' }}>
          <VerifiedUser color="primary" />
          <Handshake color="primary" />
          <Lock color="primary" />
        </Stack>
      }
      faqs={FAQS}
    />
  );
}
