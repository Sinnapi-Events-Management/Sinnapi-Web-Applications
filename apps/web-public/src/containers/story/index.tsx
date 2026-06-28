import { Typography } from '@sinnapi/ui';
import Prose from '@/components/molecules/prose';

// Story page: narrates how Sinnapi began and the problems it set out to solve.
export default function StoryContainer() {
  return (
    <Prose title="Our Story">
      <Typography component="p">
        Sinnapi was founded after more than seven years in the wedding and events industry. During
        that time we saw the same challenges again and again: clients couldn’t tell genuine vendors
        from fraudulent ones, couldn’t easily compare quotations, and struggled to coordinate
        multiple vendors. Service providers, meanwhile, lacked visibility and a centralized place to
        build trust with new customers.
      </Typography>
      <Typography component="p">
        We built Sinnapi to fix that — a trusted ecosystem where verified vendors and clients can
        safely discover each other, communicate, transact, and manage events with confidence.
      </Typography>
    </Prose>
  );
}
