import type { Metadata } from 'next';
import { Typography } from '@sinnapi/ui';
import Prose from '@/components/common/Prose';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Sinnapi is a trusted marketplace connecting clients with verified event service providers across Uganda and beyond.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <Prose title="About Sinnapi" subtitle="A trusted home for authentic event service providers.">
      <Typography component="p">
        Sinnapi was founded after more than seven years of experience in the wedding and events
        industry. We saw clients struggle to find authentic vendors, perform due diligence, build
        trust, compare quotations, and coordinate bookings — while genuine service providers
        struggled for visibility in a crowded, fragmented market.
      </Typography>
      <Typography component="p">
        Sinnapi exists to solve these problems by creating a trusted ecosystem where verified
        vendors and clients can safely discover each other, communicate, transact through secure
        escrow, and manage events end to end.
      </Typography>
      <Typography component="h2" variant="h4">
        What we offer
      </Typography>
      <Typography component="p">
        A marketplace, vendor directory, booking and quotation platform, secure messaging, escrow
        payments, and vendor subscriptions — all in one place. We start in Uganda and are built to
        scale internationally.
      </Typography>
    </Prose>
  );
}
